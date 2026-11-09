package com.fittrainer.data.auth.logout

import kotlinx.serialization.Serializable

/** Un logout guardado hasta que llegue al backend: el refresh a revocar y, si había, el token de push a borrar (#72). */
@Serializable
data class PendingLogout(val refreshToken: String, val pushToken: String? = null)

/**
 * Lo que guarda el archivo cifrado de logouts pendientes. Cada baja de un token de push suma una marca en
 * [reregisterMarks] (falta volver a registrar el de la sesión actual, ver [LogoutRetryPass]); un alta confirmada
 * sube [reregisterConfirmed] hasta la marca que vio antes de pedirla. Queda algo por restaurar mientras haya marcas
 * sin confirmar: una baja que llega mientras el alta está en vuelo deja una marca nueva que esa alta no confirma.
 */
@Serializable
data class PendingLogoutFile(
    val items: List<PendingLogout> = emptyList(),
    val reregisterMarks: Long = 0,
    val reregisterConfirmed: Long = 0,
) {
    val needsReregister: Boolean get() = reregisterMarks > reregisterConfirmed
}

/**
 * Donde [com.fittrainer.data.auth.AuthRepository] guarda cada logout antes de mandarlo, para reintentarlo con red si
 * no llega (o si matan el proceso a mitad). Ninguno lanza: si fallan, el logout local se hace igual.
 */
interface LogoutRetryQueue {
    /** Guarda [item] y deja programado el reintento. Va antes de cerrar la sesión local. */
    suspend fun hold(item: PendingLogout)

    /**
     * El logout de [refreshToken] llegó: ya no hay que reintentarlo. Con [pushTokenRemoved] el backend acaba de
     * borrar el token de push, y si mientras tanto alguien volvió a entrar, era el suyo: queda anotado que hay que
     * volver a registrar el de la sesión actual, igual que cuando lo borra el reintento.
     */
    suspend fun release(refreshToken: String, pushTokenRemoved: Boolean)

    /** Al abrir la app: si quedó algo pendiente (p. ej. el proceso murió antes de programar la pasada), la programa. */
    suspend fun resume()
}

/** Sin reintento (los tests que no lo miran). */
object NoLogoutRetry : LogoutRetryQueue {
    override suspend fun hold(item: PendingLogout) = Unit
    override suspend fun release(refreshToken: String, pushTokenRemoved: Boolean) = Unit
    override suspend fun resume() = Unit
}

/**
 * Respuestas del logout que valen otro intento: el servidor no lo procesó. El resto (2xx, o un 4xx que repetir
 * no arregla) da el logout por terminado.
 */
internal fun logoutNeedsRetry(code: Int): Boolean = code >= 500 || code == 408 || code == 429
