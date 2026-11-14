package com.fittrainer.data.account

import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.api.orThrow
import com.fittrainer.data.api.account.ChangePasswordRequest
import com.fittrainer.data.api.account.ProfileApi
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.auth.tokenstore.TokenStore
import com.fittrainer.data.db.account.MyProfileDao
import com.fittrainer.data.notifications.push.FcmTokenSource
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.util.concurrent.atomic.AtomicLong
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException

/**
 * El perfil propio (alumno o entrenador) y su contraseña. Se lee de Room y se refresca desde la API. Editar y cambiar
 * la contraseña son solo con red: son cambios de cuenta, no se encolan. Lo que devuelve el servidor queda en Room y,
 * si cambió el nombre, también en la sesión (saludo de Hoy y menú).
 */
@Singleton
class ProfileRepository @Inject constructor(
    private val api: ProfileApi,
    private val dao: MyProfileDao,
    private val tokenStore: TokenStore,
    private val pushTokens: FcmTokenSource,
    private val clock: Clock,
) : UserDataCleaner {

    fun observe(ownerId: String): Flow<MyProfile?> = dao.observe(ownerId).map { it?.toDomain() }.distinctUntilChanged()

    suspend fun refresh(ownerId: String, role: Role): Result<Unit> = call { save ->
        val owner = RequiredUser(ownerId)
        val dto = if (role == Role.STUDENT) api.studentMe(owner, ownerId).data else api.trainerMe(owner).data
        save { dao.upsert(dto.toEntity(ownerId, role, clock.millis())) }
    }

    /** Manda solo [changes]; un valor null (o vacío) borra el dato. Guarda la respuesta y el nombre en la sesión. */
    suspend fun update(ownerId: String, role: Role, changes: Map<ProfileField, String?>): Result<Unit> = call { save ->
        val owner = RequiredUser(ownerId)
        val body = JsonObject(changes.entries.associate { (field, value) -> field.wire to (value?.let(::JsonPrimitive) ?: JsonNull) })
        val dto = if (role == Role.STUDENT) api.updateStudent(owner, ownerId, body).data else api.updateTrainer(owner, body).data
        save {
            dao.upsert(dto.toEntity(ownerId, role, clock.millis()))
            if (ProfileField.NAME in changes) sessionOf(ownerId)?.let { tokenStore.updateUserName(it, dto.name) }
        }
    }

    /** La foto del alumno, ya achicada en JPEG. */
    suspend fun setAvatar(ownerId: String, jpeg: ByteArray): Result<Unit> = call { save ->
        val image = MultipartBody.Part.createFormData("image", "perfil.jpg", jpeg.toRequestBody(JPEG))
        val url = api.setAvatar(RequiredUser(ownerId), ownerId, image).data.avatarUrl
        save { dao.get(ownerId)?.let { dao.upsert(it.copy(avatarUrl = url)) } }
    }

    suspend fun removeAvatar(ownerId: String): Result<Unit> = call { save ->
        api.removeAvatar(RequiredUser(ownerId), ownerId).orThrow()
        save { dao.get(ownerId)?.let { dao.upsert(it.copy(avatarUrl = null)) } }
    }

    /**
     * PUT /auth/password con el refresh de esta sesión y el push token del celular (si FCM lo da en 2 s), para que el
     * backend no borre el push propio. El access token nuevo reemplaza al guardado y, como ya no lleva la marca de clave
     * temporal (GX1), la sesión la saca: la raíz pasa sola de la pantalla de la clave temporal a las pestañas.
     */
    suspend fun changePassword(ownerId: String, current: String, new: String): Result<Unit> = call { save ->
        val state = tokenStore.read()?.takeIf { it.user.id == ownerId } ?: throw AccountChangedException()
        val push = withTimeoutOrNull(PUSH_TOKEN_TIMEOUT_MS) { pushTokenOrNull() }
        val token = api.changePassword(RequiredUser(ownerId), ChangePasswordRequest(current, new, state.refreshToken, push)).token
        // Token y marca en una sola escritura: nunca queda el token nuevo con la marca vieja (que pediría una temporal muerta).
        save { tokenStore.updateAccessToken(state.sessionId, token, mustChangePassword = false) }
    }

    // Sin FCM (sin Play Services, sin red a Google) se cambia igual: el backend solo no conserva el push de este celular.
    private suspend fun pushTokenOrNull(): String? = try {
        pushTokens.token()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        null
    }

    private suspend fun sessionOf(ownerId: String): String? = tokenStore.current()?.takeIf { it.user.id == ownerId }?.sessionId

    // Cerrar sesión no espera a la red: sube la generación y borra. Un pedido que salió antes guarda solo si la
    // generación sigue igual, con el chequeo y la escritura bajo el mismo lock que el borrado (como en turnos).
    private val generation = AtomicLong()
    private val writeLock = Mutex()

    private suspend fun guarded(started: Long, write: suspend () -> Unit) = writeLock.withLock {
        if (generation.get() != started) throw StaleWriteException()
        write()
    }

    private suspend fun call(block: suspend (save: suspend (suspend () -> Unit) -> Unit) -> Unit): Result<Unit> {
        val started = generation.get()
        return try {
            block { guarded(started, it) }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: StaleWriteException) {
            Result.failure(DataException(e.toDataError(), e))
        } catch (e: HttpException) {
            Result.failure(httpFailure(e))
        } catch (e: Exception) {
            Result.failure(DataException(e.toDataError(), e))
        }
    }

    override suspend fun clearUserData(ownerId: String?) = writeLock.withLock {
        generation.incrementAndGet()
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }

    private companion object {
        val JPEG = "image/jpeg".toMediaType()
        const val PUSH_TOKEN_TIMEOUT_MS = 2_000L
    }
}

/** 400 por campo, 413/415 de la foto; el resto como cualquier error de datos. */
internal fun httpFailure(e: HttpException): Exception = when (e.code()) {
    400 -> e.errorEnvelope().let { body ->
        val fields = body?.details.orEmpty().mapNotNull { d -> d.field?.let { f -> d.message?.let { f to it } } }.toMap()
        if (fields.isEmpty() && body?.message == null) DataException(e.toDataError(), e) else FieldErrorsException(fields, body?.message)
    }
    413 -> AvatarRejectedException(AVATAR_TOO_LARGE)
    415 -> AvatarRejectedException(AVATAR_TYPE_INVALID)
    else -> DataException(e.toDataError(), e)
}

/** Un pedido que salió antes de cerrar sesión: lo que trae ya no se guarda. */
private class StaleWriteException : Exception()
