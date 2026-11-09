package com.fittrainer.data.chat

import com.fittrainer.data.agenda.localDay
import com.fittrainer.data.api.chat.AiChatApi
import com.fittrainer.data.api.chat.AiChatReplyDto
import com.fittrainer.data.api.chat.AiChatRequest
import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.db.chat.AiChatDao
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import java.util.concurrent.atomic.AtomicLong
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.HttpException

/**
 * Chat IA del alumno (tarjeta 14). La conversación del día vive en Room y se refresca con GET /chat/today. Enviar es
 * solo con red y sin reintento: POST /chat no acepta un id del cliente y cada intento gasta cupo y una llamada a la
 * IA. Solo lo que salió bien se guarda. Única excepción: SESSION_FINISHED (sale antes de llamar a la IA) se reintenta
 * una vez sin session_id.
 */
@Singleton
class AiChatRepository @Inject constructor(
    private val api: AiChatApi,
    private val dao: AiChatDao,
    private val clock: Clock,
) : UserDataCleaner {

    // Cerrar sesión sube la generación y borra; una respuesta que llega después no se guarda (como los turnos).
    private val generation = AtomicLong()
    // Sube con cada par guardado por un envío: un refresh que salió antes no pisa lo que llegó mientras tanto.
    private val sends = AtomicLong()
    private val writeLock = Mutex()

    /** Los mensajes del día de Argentina, pregunta antes que respuesta; a la medianoche pasa solo al día nuevo. */
    @OptIn(ExperimentalCoroutinesApi::class)
    fun observeToday(ownerId: String): Flow<AiChatToday> = argentinaDays(clock).flatMapLatest { day ->
        val (from, to) = dayBounds(day)
        dao.observeBetween(ownerId, from, to).map { rows -> AiChatToday(day, rows.map { it.toDomain() }) }
    }.distinctUntilChanged()

    /**
     * Reemplaza el día con lo del servidor, conservando las sugerencias por id, y devuelve el cupo. Si mientras tanto
     * se guardó un envío, la respuesta es vieja (no lo trae y su cupo ya no vale): no se escribe y sale como falla.
     */
    suspend fun refresh(ownerId: String): Result<AiChatQuota> = call {
        val started = generation.get()
        val sendsAtStart = sends.get()
        val day = localDay(clock.instant())
        val today = api.today(RequiredUser(ownerId)).data
        val (from, to) = dayBounds(day)
        guarded(started) {
            if (sends.get() != sendsAtStart) throw AiChatException(AiChatError.Unknown)
            val kept = dao.getBetween(ownerId, from, to).associate { it.id to it.suggestionsJson }
            dao.replaceBetween(ownerId, from, to, today.messages.map { it.toEntity(ownerId, kept[it.id]) })
        }
        AiChatQuota(today.remainingToday, day)
    }

    /** Una consulta. Si sale bien guarda pregunta y respuesta y devuelve el cupo; si no, AiChatException. */
    suspend fun send(ownerId: String, message: String, sessionId: String?, exerciseId: String?): Result<AiChatQuota> = call {
        val started = generation.get()
        // El instante de la pregunta, como el backend: si la respuesta llega pasada la medianoche, el par sigue en
        // el día que la hoja está mirando.
        val askedAt = clock.millis()
        val reply = post(ownerId, AiChatRequest(message, sessionId, exerciseId))
        guarded(started) {
            dao.insert(listOf(userEntity(ownerId, message, askedAt), reply.toEntity(ownerId, askedAt)))
            sends.incrementAndGet()
        }
        AiChatQuota(reply.remainingToday, localDay(Instant.ofEpochMilli(askedAt)))
    }

    private suspend fun post(ownerId: String, body: AiChatRequest): AiChatReplyDto = try {
        api.send(RequiredUser(ownerId), body).data
    } catch (e: HttpException) {
        val envelope = e.errorEnvelope()
        if (body.sessionId == null || e.code() != 400 || envelope?.code != SESSION_FINISHED) {
            throw AiChatException(httpAiChatError(e.code(), envelope, e.response()?.headers()?.get("Retry-After")), e)
        }
        api.send(RequiredUser(ownerId), body.copy(sessionId = null)).data
    }

    private suspend fun guarded(started: Long, write: suspend () -> Unit) = writeLock.withLock {
        if (generation.get() != started) throw AiChatException(AiChatError.Unknown)
        write()
    }

    private suspend fun <T> call(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e as? AiChatException ?: AiChatException(e.toAiChatError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) = writeLock.withLock {
        generation.incrementAndGet()
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}
