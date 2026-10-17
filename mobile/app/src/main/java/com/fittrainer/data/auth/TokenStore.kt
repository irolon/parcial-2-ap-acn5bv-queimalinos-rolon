package com.fittrainer.data.auth

import androidx.datastore.core.DataStore
import java.io.IOException
import java.time.Clock
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.retryWhen
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/** Único punto de acceso a la sesión guardada. La implementación real la cifra. */
interface TokenStore {
    val state: Flow<AuthState?>
    /** Sesión visible; un error de disco se lee como "sin sesión" (interceptor y authenticator). */
    suspend fun current(): AuthState?
    /** Como [current], pero un error de disco lanza la IOException: "sin sesión" ≠ "no se pudo leer". */
    suspend fun read(): AuthState?
    suspend fun save(state: AuthState)
    /** Cambia el access token solo si la sesión guardada sigue siendo [sessionId]. */
    suspend fun updateAccessToken(sessionId: String, token: String)
    /**
     * Cierra la sesión sin condiciones (logout). Una marca de cierre solo oculta sesiones cerradas;
     * nunca una sesión creada después de la marca. En todos los casos [state] y [current] dejan de
     * devolverla. Si el disco no se puede escribir pero el cierre quedó registrado por otro camino
     * persistente, el cierre está completo y no lanza. Si no quedó registrado en ningún lado lanza
     * [SessionNotClosedException]: la sesión solo queda oculta en este proceso.
     */
    suspend fun clear()
    /** Como [clear], pero solo si la sesión guardada sigue siendo [sessionId] (refresh rechazado). */
    suspend fun clearIf(sessionId: String)
}

/** El cierre de sesión no quedó guardado en disco: puede reaparecer si la app se reinicia. */
class SessionNotClosedException(cause: Throwable) :
    IOException("No se pudo guardar el cierre de sesión", cause)

/**
 * [TokenStore] sobre DataStore.
 *
 * Un cierre de sesión cuya escritura falla igual cuenta: la sesión se marca como cerrada en memoria
 * y en [tombstones] (otro archivo, otro camino de escritura), así sigue oculta después de reiniciar
 * la app. El archivo viejo puede quedar en disco y su access token
 * sigue siendo válido hasta que vence (revocar el refresh no lo invalida): por eso no alcanza con la
 * revocación del backend y hace falta la marca persistente. Con la marca guardada el cierre está
 * completo y [clear] no lanza.
 *
 * Invariante: una marca solo oculta sesiones cerradas; nunca una sesión creada después de la marca.
 * La de una sesión es su id (UUID, no coincide con un login nuevo); la de "todas" (cuando no se pudo
 * leer qué sesión había) lleva la hora del cierre y solo oculta sesiones con `createdAt` hasta esa
 * hora. Así una marca vieja que no se pudo borrar tras un [save] nunca esconde la sesión nueva:
 * además [save] corre el `createdAt` de la sesión nueva a después de la marca de "todas" más nueva
 * (login que corrió contra un logout fallido, o reloj atrasado). Y la marca de "todas" nunca es
 * anterior al `createdAt` más nuevo visto en este proceso (reloj atrasado entre login y logout).
 *
 * Residual: si el proceso nunca pudo leer el archivo, el reloj atrasó y el clear falló, la marca
 * puede quedar anterior a la sesión y esta reaparece cuando una lectura posterior funcione.
 *
 * Residual: si fallan las dos escrituras (DataStore y marca), [clear] lanza
 * [SessionNotClosedException] y la sesión solo queda oculta en este proceso; el logout igual intenta
 * revocar el refresh token en el backend y avisa al usuario.
 *
 * Cada mutación entera (escritura de DataStore + estado en memoria + marcas) corre bajo [mutex]: si
 * no, un [save] anterior podía vaciar las marcas después de que un [clear] posterior guardara la suya,
 * y la sesión cerrada reaparecía al reiniciar. Las lecturas no toman el lock.
 */
class DataStoreTokenStore(
    private val dataStore: DataStore<AuthFile>,
    private val tombstones: SessionTombstones,
    /** Donde corre la E/S de [tombstones]; los tests pasan uno de prueba para ordenar las corrutinas. */
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    /** Fecha las marcas de "todas cerradas"; los tests pasan uno fijo. */
    private val clock: Clock = Clock.systemUTC(),
) : TokenStore {

    private val mutex = Mutex()

    // Sesiones cerradas cuyo borrado en disco falló. Las marcas persistentes se leen una sola vez
    // al construir, así [state] y [current] no tocan el disco en cada lectura.
    private val closed = MutableStateFlow(tombstones.closed())

    // El createdAt más nuevo visto en este proceso (guardado o leído): piso de la marca de "todas".
    private val latestCreatedAt = MutableStateFlow(0L)

    // Un error de disco al leer se trata como "sin sesión" (vuelve al login), nunca como crash, y
    // se vuelve a leer al rato: la observación no termina, así un login posterior se ve.
    private val file: Flow<AuthFile> = dataStore.data.onEach(::seen).retryWhen { cause, _ ->
        if (cause !is IOException) return@retryWhen false
        emit(AuthFile())
        delay(READ_RETRY_DELAY_MS)
        true
    }

    override val state: Flow<AuthState?> =
        combine(file, closed) { file, closed -> file.auth.visible(closed) }.distinctUntilChanged()

    override suspend fun current(): AuthState? = file.first().auth.visible(closed.value)

    // Sin retry ni fallback: una IOException de lectura llega al llamador.
    override suspend fun read(): AuthState? = dataStore.data.first().also(::seen).auth.visible(closed.value)

    override suspend fun save(state: AuthState) {
        mutex.withLock {
            // NonCancellable: una vez escrito el archivo se intenta vaciar las marcas. Si falla, las
            // que quedan no ocultan la sesión nueva (es posterior a todas).
            // Después de toda marca de "todas" (en memoria = disco), por si el reset de abajo falla.
            val latestMark = closed.value.maxOfOrNull { allSessionsClosedAt(it) ?: -1L } ?: -1L
            val saved = if (state.createdAt > latestMark) state else state.copy(createdAt = latestMark + 1)
            withContext(NonCancellable) {
                dataStore.updateData { AuthFile(saved) }
                seen(AuthFile(saved))
                // El archivo ya tiene solo la sesión nueva: lo cerrado antes no puede reaparecer.
                resetClosed()
            }
        }
    }

    // La condición se evalúa dentro de updateData: atómica respecto de un save() de otra cuenta.
    override suspend fun updateAccessToken(sessionId: String, token: String) {
        mutex.withLock {
            dataStore.updateData { file ->
                val auth = file.auth
                if (auth?.sessionId == sessionId) file.copy(auth = auth.copy(accessToken = token)) else file
            }
        }
    }

    override suspend fun clear() {
        mutex.withLock {
            // Si falla antes de leer el archivo no se sabe qué sesión había: se ocultan todas las
            // creadas hasta ahora.
            var sessionId: String? = null
            val written = closing({ sessionId ?: allSessionsMark() }) {
                dataStore.updateData { file ->
                    sessionId = file.auth?.sessionId
                    AuthFile()
                }
            }
            // El archivo quedó vacío: no queda nada que ocultar. Si no se escribió, la marca se queda.
            if (written) resetClosed()
        }
    }

    override suspend fun clearIf(sessionId: String) {
        mutex.withLock {
            closing({ sessionId }) {
                dataStore.updateData { file -> if (file.auth?.sessionId == sessionId) AuthFile() else file }
            }
        }
    }

    /**
     * Corre [write] y devuelve true si escribió. Si falla, marca [sessionId] como cerrada en memoria
     * y en [tombstones]: con la marca guardada el cierre es persistente y devuelve false; si la marca
     * tampoco se guardó lanza [SessionNotClosedException]. Una cancelación se relanza tal cual.
     */
    private suspend fun closing(sessionId: () -> String, write: suspend () -> Unit): Boolean {
        try {
            write()
            return true
        } catch (e: Throwable) {
            val id = sessionId()
            closed.update { it + id }
            // NonCancellable: la marca se guarda aunque el cierre haya fallado por cancelación.
            val marked = withContext(NonCancellable + ioDispatcher) {
                runCatching { tombstones.close(id) }
            }
            if (e is CancellationException) throw e
            if (marked.getOrDefault(false)) return false
            throw SessionNotClosedException(e).apply { marked.exceptionOrNull()?.let(::addSuppressed) }
        }
    }

    /**
     * Vacía las marcas: primero el disco y la memoria solo si el disco quedó vacío, así ambos tienen
     * siempre las mismas marcas. Es limpieza: si falla no lanza (las marcas que quedan son inofensivas).
     */
    private suspend fun resetClosed() {
        val reset = withContext(NonCancellable + ioDispatcher) { runCatching { tombstones.reset() } }
        if (reset.getOrDefault(false)) closed.value = emptySet()
    }

    private fun allSessionsMark(): String = "$ALL_SESSIONS@${maxOf(clock.millis(), latestCreatedAt.value)}"

    private fun seen(file: AuthFile) {
        val createdAt = file.auth?.createdAt ?: return
        latestCreatedAt.update { maxOf(it, createdAt) }
    }

    private fun AuthState?.visible(closed: Set<String>): AuthState? =
        this?.takeUnless { state -> closed.any { it.hides(state) } }

    private fun String.hides(state: AuthState): Boolean {
        if (this == state.sessionId) return true
        val closedAt = allSessionsClosedAt(this) ?: return false
        return closedAt >= state.createdAt
    }

    /**
     * Hora de una marca de "todas" (`*@<epochMillis>`), o null si es el id de una sesión. La `*` sin
     * hora (versión anterior), ilegible o con la hora máxima (corrupta) vale 0: oculta las sesiones
     * guardadas sin `createdAt` (leen 0), que son las únicas que pudo cerrar, y ninguna creada después.
     * Al ser siempre menor que `Long.MAX_VALUE`, el `+ 1` de [save] no desborda.
     */
    private fun allSessionsClosedAt(mark: String): Long? = when {
        mark == ALL_SESSIONS -> 0L
        mark.startsWith("$ALL_SESSIONS@") ->
            mark.substringAfter('@').toLongOrNull()?.takeIf { it < Long.MAX_VALUE } ?: 0L
        else -> null
    }

    companion object {
        /** Espera antes de volver a leer el archivo tras un error de disco. */
        const val READ_RETRY_DELAY_MS = 1_000L
        private const val ALL_SESSIONS = "*"
    }
}
