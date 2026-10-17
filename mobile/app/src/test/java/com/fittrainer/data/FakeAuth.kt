package com.fittrainer.data

import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.api.LoginResponse
import com.fittrainer.data.api.RefreshRequest
import com.fittrainer.data.api.RefreshResponse
import com.fittrainer.data.api.UserDto
import androidx.datastore.core.DataStore
import com.fittrainer.data.auth.AuthFile
import com.fittrainer.data.auth.AuthState
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.auth.SessionTombstones
import com.fittrainer.data.auth.TokenStore
import com.fittrainer.data.session.Role
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

fun authState(
    access: String = "access-1",
    refresh: String = "refresh-1",
    role: Role = Role.STUDENT,
    session: String = "session-1",
    createdAt: Long = CREATED_AT,
) = AuthState(access, refresh, AuthUser("u1", "Ana", "ana@test.com", role), session, createdAt)

/** Momento del login de [authState] por defecto; es la hora de [fixedClock]. */
const val CREATED_AT = 1_000L

fun fixedClock(millis: Long = CREATED_AT): Clock = Clock.fixed(Instant.ofEpochMilli(millis), ZoneOffset.UTC)

/** Reloj que el test adelanta a mano. */
class MutableClock(var millis: Long) : Clock() {
    override fun millis(): Long = millis
    override fun instant(): Instant = Instant.ofEpochMilli(millis)
    override fun getZone(): ZoneId = ZoneOffset.UTC
    override fun withZone(zone: ZoneId): Clock = this
}

fun httpError(code: Int) = HttpException(Response.error<Any>(code, "{}".toResponseBody(null)))

/** TokenStore en memoria. [saveError], [clearError] y [readError] simulan fallas del almacenamiento. */
class FakeTokenStore(initial: AuthState? = null) : TokenStore {
    val flow = MutableStateFlow(initial)
    var saveError: Throwable? = null
    var clearError: Throwable? = null
    var readError: Throwable? = null
    var clearCalls = 0
    override val state: Flow<AuthState?> = flow
    override suspend fun current(): AuthState? = flow.value
    override suspend fun read(): AuthState? {
        readError?.let { throw it }
        return flow.value
    }
    override suspend fun save(state: AuthState) {
        saveError?.let { throw it }
        flow.value = state
    }
    override suspend fun updateAccessToken(sessionId: String, token: String) {
        flow.value = flow.value?.let { if (it.sessionId == sessionId) it.copy(accessToken = token) else it }
    }
    override suspend fun clear() {
        clearCalls++
        clearError?.let { throw it }
        flow.value = null
    }
    override suspend fun clearIf(sessionId: String) {
        if (flow.value?.sessionId == sessionId) clear()
    }
}

/**
 * DataStore en memoria, sin Tink. [failWrites] simula disco lleno; [failBeforeRead] una escritura que
 * falla antes de leer el archivo; [readFailures] colecciones que fallan al leer; [afterWriteGate] frena
 * la próxima escritura exitosa ya guardada, antes de volver al llamador.
 */
class FakeDataStore(initial: AuthFile = AuthFile()) : DataStore<AuthFile> {
    val value = MutableStateFlow(initial)
    var failWrites = false
    var failBeforeRead = false
    var readFailures = 0
    var afterWriteGate: CompletableDeferred<Unit>? = null
    private val mutex = Mutex()

    override val data: Flow<AuthFile> = flow {
        if (readFailures > 0) {
            readFailures--
            throw IOException("disco ilegible")
        }
        emitAll(value)
    }

    override suspend fun updateData(transform: suspend (t: AuthFile) -> AuthFile): AuthFile {
        val next = mutex.withLock {
            if (failBeforeRead) throw IOException("disco ilegible")
            val next = transform(value.value)
            if (failWrites) throw IOException("disco lleno")
            value.value = next
            next
        }
        // Fuera del lock: el archivo ya cambió y otra escritura puede entrar mientras este llamador espera.
        afterWriteGate?.let { gate ->
            afterWriteGate = null
            gate.await()
        }
        return next
    }
}

/** Marcas de sesión cerrada en memoria; compartirlas entre dos stores simula un reinicio del proceso. */
class FakeSessionTombstones : SessionTombstones {
    private var ids = emptySet<String>()
    var failWrites = false
    /** Si no es null, close() lanza esta excepción (en vez de devolver false). */
    var closeError: Throwable? = null
    /** Si es true, solo reset() falla (devuelve false); close() sigue funcionando. */
    var failReset = false
    /** Si no es null, reset() lanza esta excepción. */
    var resetError: Throwable? = null
    override fun closed(): Set<String> = ids
    override fun close(id: String): Boolean {
        closeError?.let { throw it }
        if (failWrites) return false
        ids = ids + id
        return true
    }
    override fun reset(): Boolean {
        resetError?.let { throw it }
        if (failWrites || failReset) return false
        ids = emptySet()
        return true
    }
}

/**
 * AuthApi falsa. Cada endpoint devuelve su respuesta o lanza su error; [loginGate] demora el login y
 * [onRefresh] corre durante el refresh (p. ej. para cambiar de cuenta mientras está en curso).
 */
class FakeAuthApi : AuthApi {
    var loginResponse = LoginResponse(UserDto("u1", "Ana", "ana@test.com", "student"), "access-1", "refresh-1")
    var loginError: Throwable? = null
    var loginGate: CompletableDeferred<Unit>? = null
    var refreshResponse = RefreshResponse("access-2")
    var refreshError: Throwable? = null
    var onRefresh: (suspend () -> Unit)? = null
    var logoutError: Throwable? = null
    /** Códigos que devuelven los próximos logout, en orden; vacío = 204. */
    val logoutCodes = ArrayDeque<Int>()

    val loginCalls = mutableListOf<LoginRequest>()
    val refreshCalls = mutableListOf<RefreshRequest>()
    val logoutCalls = mutableListOf<Pair<String, RefreshRequest>>()

    override suspend fun login(body: LoginRequest): LoginResponse {
        loginCalls += body
        loginGate?.await()
        loginError?.let { throw it }
        return loginResponse
    }

    override suspend fun refresh(body: RefreshRequest): RefreshResponse {
        refreshCalls += body
        onRefresh?.invoke()
        refreshError?.let { throw it }
        return refreshResponse
    }

    override suspend fun logout(bearer: String, body: RefreshRequest): Response<Unit> {
        logoutCalls += bearer to body
        logoutError?.let { throw it }
        val code = logoutCodes.removeFirstOrNull() ?: 204
        return if (code in 200..299) Response.success(code, Unit) else Response.error(code, "{}".toResponseBody(null))
    }
}
