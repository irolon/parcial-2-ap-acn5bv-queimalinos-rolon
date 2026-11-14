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
    /** Con [expectedAccess], solo si el access guardado sigue siendo ese (un refresh que vuelve tarde no pisa uno más nuevo). */
    suspend fun updateAccessToken(
        sessionId: String,
        token: String,
        expectedAccess: String? = null,
        /** Si no es null, la marca de clave temporal se escribe en la misma escritura que el token (cambio de clave). */
        mustChangePassword: Boolean? = null,
    )
    /** Cambia el nombre del usuario solo si la sesión guardada sigue siendo [sessionId] (editó su perfil). */
    suspend fun updateUserName(sessionId: String, name: String)
    /**
     * Pone o saca la marca de clave temporal (`AuthUser.mustChangePassword`) solo si la sesión guardada sigue siendo
     * [sessionId] y, con [accessToken], si el access guardado sigue siendo ese: la marca describe al access token, así
     * un 403 de un access viejo no la vuelve a poner después del cambio de clave.
     */
    suspend fun setMustChangePassword(sessionId: String, value: Boolean, accessToken: String? = null)
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
