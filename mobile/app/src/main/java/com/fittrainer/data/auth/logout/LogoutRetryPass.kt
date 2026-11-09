package com.fittrainer.data.auth.logout

import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.LogoutRequest
import com.fittrainer.data.notifications.push.PushTokenRegistry
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException

/**
 * Una pasada de reintento: manda cada logout pendiente sin access token (el backend no lo pide y el de esa sesión
 * ya no está) y saca los que llegaron. Devuelve true si no quedó ninguno.
 *
 * El token de push es del celular, no de la sesión: si entre el logout y esta pasada alguien volvió a entrar, su
 * alta registró ese mismo token y el reintento se lo acaba de borrar. Por eso, si se borró alguno, queda anotado
 * (en la misma escritura que saca el pendiente) que hay que volver a registrar el de la sesión actual, y la marca
 * se confirma recién cuando el alta funcionó: si falla, o llegó otra baja mientras tanto, la pasada pide
 * reintento. El alta queda siempre después de la baja.
 */
class LogoutRetryPass @Inject constructor(
    private val api: AuthApi,
    private val store: PendingLogoutStore,
    private val pushTokens: PushTokenRegistry,
) {
    suspend fun run(): Boolean {
        val pending = store.all()
        val delivered = pending.filter { send(it) }
        store.remove(delivered.map { it.refreshToken }.toSet(), reregister = delivered.any { it.pushToken != null })
        return restorePushToken() && delivered.size == pending.size
    }

    /**
     * Confirma solo la marca vista antes de pedir el alta: si mientras el alta estaba en vuelo llegó otra baja (el
     * logout directo), su marca queda sin confirmar y la pasada que programó ese logout la restaura.
     */
    private suspend fun restorePushToken(): Boolean {
        val mark = store.reregisterMark() ?: return true
        if (!pushTokens.registerCurrent()) return false
        store.confirmReregister(mark)
        return !store.needsReregister()
    }

    private suspend fun send(item: PendingLogout): Boolean = try {
        !logoutNeedsRetry(api.logout(null, LogoutRequest(item.refreshToken, item.pushToken)).code())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        // Sin red u otra falla de transporte: queda para la próxima.
        false
    }
}
