package com.fittrainer.data.auth.tokenstore

import com.fittrainer.data.auth.AuthState
import java.io.IOException
import kotlinx.coroutines.flow.Flow

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
