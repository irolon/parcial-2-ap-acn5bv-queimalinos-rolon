package com.fittrainer.data.messages.trainer

import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.api.messages.BroadcastRequest
import com.fittrainer.data.api.messages.SendMessageRequest
import com.fittrainer.data.api.messages.TrainerMessagesApi
import com.fittrainer.data.db.messages.trainer.TrainerConversationsSyncEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessageEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessageThreadEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessagesDao
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException

/** Mensajes por página (el backend permite hasta 100). */
const val MESSAGES_PAGE = 50

/** Una URL de foto firmada hace más de esto se renueva (el backend las firma por 1 h). */
const val IMAGE_URL_TTL_MS = 50 * 60_000L

/** Cuántos mensajes se re-piden por vez para renovar fotos. */
private const val RENEW_PAGE = 100
private const val STUDENT_INACTIVE = "STUDENT_INACTIVE"
private val JPEG = "image/jpeg".toMediaType()
private val TEXT = "text/plain; charset=utf-8".toMediaType()

/**
 * Mensajes del entrenador (E11), offline-first: lista y chats salen de Room. Enviar, leer y difundir
 * son solo online y guardan la respuesta, así se ve enseguida. El chat del alumno (tarjeta 18) usa la misma
 * caché: ahí `trainerId` es el dueño del caché, o sea, el propio alumno.
 */
@Singleton
class TrainerMessagesRepository @Inject constructor(
    private val api: TrainerMessagesApi,
    private val dao: TrainerMessagesDao,
    private val clock: Clock,
) : UserDataCleaner {

    /** null = la lista nunca se bajó. */
    fun observeConversations(trainerId: String): Flow<ConversationsCache?> =
        combine(dao.observeConversations(trainerId), dao.observeConversationsSync(trainerId)) { rows, sync ->
            sync?.let { ConversationsCache(rows.map { it.toDomain() }, Instant.ofEpochMilli(it.fetchedAt)) }
        }.distinctUntilChanged()

    fun observeUnread(trainerId: String): Flow<Int> = dao.observeUnreadTotal(trainerId).distinctUntilChanged()

    /** null = el chat nunca se bajó. */
    fun observeThread(trainerId: String, studentId: String): Flow<ThreadCache?> =
        combine(dao.observeMessages(trainerId, studentId), dao.observeThread(trainerId, studentId)) { rows, thread ->
            thread?.let {
                ThreadCache(it.counterpartName, rows.map { m -> m.toDomain() }, it.nextBefore != null, Instant.ofEpochMilli(it.fetchedAt))
            }
        }.distinctUntilChanged()

    suspend fun refreshConversations(trainerId: String): Result<Unit> = call(trainerId, null) {
        val rows = api.conversations().data.mapIndexed { i, dto -> dto.toEntity(trainerId, i) }
        dao.replaceConversations(TrainerConversationsSyncEntity(trainerId, clock.millis()), rows)
    }

    /**
     * La página más nueva. Si viene llena y su mensaje más viejo es posterior al último guardado, se perdió
     * el medio: el chat se reemplaza por esta página y su cursor. Si no, se suma y el cursor sigue siendo el
     * de la página más vieja que ya se había bajado. Un chat guardado sin mensajes cuenta como primera carga
     * (si no, quedaría con el cursor null aunque haya más atrás). Después renueva las fotos vencidas.
     */
    suspend fun refreshThread(trainerId: String, studentId: String): Result<Unit> = call(trainerId, studentId) {
        val page = api.history(studentId, MESSAGES_PAGE)
        val rows = keepSigned(trainerId, page.data.map { it.toEntity(trainerId, clock.millis()) })
        val saved = dao.getThread(trainerId, studentId)
        val newest = dao.newestAt(trainerId, studentId)
        val gap = page.meta.nextBefore != null && newest != null && rows.isNotEmpty() && rows.first().createdAt > newest
        if (saved == null || newest == null || gap) {
            dao.replaceThread(TrainerMessageThreadEntity(trainerId, studentId, page.counterpart.name, page.meta.nextBefore, clock.millis()), rows)
        } else {
            dao.mergeThread(saved.copy(counterpartName = page.counterpart.name, fetchedAt = clock.millis()), rows)
        }
        renewStaleImages(trainerId, studentId)
    }

    /**
     * Las fotos de páginas viejas no vuelven con el refresco de la página más nueva: si alguna URL tiene más
     * de 50 min, se re-piden hasta 100 mensajes desde la más nueva de esas (before exclusivo, por eso +1 ms)
     * y se guardan solo los que ya estaban en el rango cargado. Si quedan más, sigue en el próximo refresco.
     */
    private suspend fun renewStaleImages(trainerId: String, studentId: String) {
        val stale = dao.newestStaleImageAt(trainerId, studentId, clock.millis() - IMAGE_URL_TTL_MS) ?: return
        val oldest = dao.oldestAt(trainerId, studentId) ?: return
        val page = api.history(studentId, RENEW_PAGE, Instant.ofEpochMilli(stale + 1).toString())
        val rows = page.data.map { it.toEntity(trainerId, clock.millis()) }.filter { it.createdAt >= oldest }
        dao.upsertMessages(keepSigned(trainerId, rows))
    }

    /**
     * Si Storage falla, el backend igual responde con image_url null en esas fotos. Una que ya tenía URL la
     * conserva con su fetchedAt viejo (si no venció se sigue viendo, y la renovación la vuelve a pedir); una con
     * foto (hasImage, también con texto desde la #73) sin URL guardada queda con fetchedAt 0, así se reintenta en
     * el próximo refresco.
     */
    private suspend fun keepSigned(trainerId: String, rows: List<TrainerMessageEntity>): List<TrainerMessageEntity> {
        val unsigned = rows.filter { it.imageUrl == null }.map { it.id }
        if (unsigned.isEmpty()) return rows
        val prev = dao.getMessages(trainerId, unsigned).filter { it.imageUrl != null }.associateBy { it.id }
        return rows.map { row ->
            val old = prev[row.id]
            when {
                row.imageUrl != null -> row
                old != null -> row.copy(imageUrl = old.imageUrl, fetchedAt = old.fetchedAt)
                row.hasImage -> row.copy(fetchedAt = 0)
                else -> row
            }
        }
    }

    /** La página anterior a la más vieja guardada; sin cursor no hace nada. */
    suspend fun loadOlder(trainerId: String, studentId: String): Result<Unit> = call(trainerId, studentId) {
        val saved = dao.getThread(trainerId, studentId) ?: return@call
        val before = saved.nextBefore ?: return@call
        val page = api.history(studentId, MESSAGES_PAGE, before)
        dao.mergeThread(saved.copy(nextBefore = page.meta.nextBefore), keepSigned(trainerId, page.data.map { it.toEntity(trainerId, clock.millis()) }))
    }

    /** Solo texto. 409 → StudentInactiveException; 403 → la conversación sale del caché y NotFound. */
    suspend fun send(trainerId: String, studentId: String, text: String): Result<Unit> = call(trainerId, studentId) {
        saveSent(trainerId, studentId, api.send(studentId, SendMessageRequest(text.trim())).data.toEntity(trainerId, clock.millis()))
    }

    /** Una foto ya en JPEG con epígrafe opcional (tarjeta 18). 413/415 → PhotoRejectedException; el resto, como [send]. */
    suspend fun sendPhoto(trainerId: String, studentId: String, jpeg: ByteArray, caption: String?): Result<Unit> = call(trainerId, studentId) {
        val image = MultipartBody.Part.createFormData("image", "foto.jpg", jpeg.toRequestBody(JPEG))
        val body = caption?.trim()?.takeIf { it.isNotEmpty() }?.toRequestBody(TEXT)
        saveSent(trainerId, studentId, api.sendPhoto(studentId, image, body).data.toEntity(trainerId, clock.millis()))
    }

    private suspend fun saveSent(trainerId: String, studentId: String, sent: TrainerMessageEntity) {
        dao.upsertMessages(listOf(sent))
        dao.getConversation(trainerId, studentId)?.let { dao.upsertConversations(listOf(it.withSent(sent))) }
    }

    /** Leídos los del otro lado, en el servidor y en Room (también páginas viejas) hasta el más nuevo guardado al pedirlo. */
    suspend fun markRead(trainerId: String, studentId: String): Result<Unit> = call(trainerId, studentId) {
        val upTo = dao.newestAt(trainerId, studentId)
        api.markRead(studentId)
        val incoming = if (trainerId == studentId) SENDER_TRAINER else SENDER_STUDENT
        upTo?.let { dao.markIncomingRead(trainerId, studentId, incoming, clock.millis(), it) }
        dao.markConversationRead(trainerId, studentId)
    }

    /** El mismo texto a varios. Devuelve a cuántos se mandó. 403: alguno ya no es alumno activo (no se mandó a nadie). */
    suspend fun broadcast(trainerId: String, studentIds: List<String>, text: String): Result<Int> = call(trainerId, null) {
        api.broadcast(BroadcastRequest(studentIds, text.trim())).data.sent
    }

    // Un Mutex por entrenador, que abarca la red y Room: un GET que salió antes de un envío no pisa lo
    // recién guardado (lo que Codex encontró en los ejercicios de E10).
    private val locks = ConcurrentHashMap<String, Mutex>()

    private suspend fun <T> call(trainerId: String, studentId: String?, block: suspend () -> T): Result<T> = try {
        Result.success(locks.getOrPut(trainerId) { Mutex() }.withLock { block() })
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        val env = e.errorEnvelope()
        Result.failure(
            when {
                e.code() == 409 && env?.code == STUDENT_INACTIVE -> StudentInactiveException(env.message ?: "El alumno está dado de baja")
                e.code() == 413 || e.code() == 415 -> PhotoRejectedException()
                e.code() == 403 -> {
                    studentId?.let { dao.forget(trainerId, it) }
                    DataException(DataError.NotFound, e)
                }
                else -> DataException(e.toDataError(), e)
            },
        )
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}
