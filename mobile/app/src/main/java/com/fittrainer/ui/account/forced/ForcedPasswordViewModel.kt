package com.fittrainer.ui.account.forced

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.notifications.push.PushTokenRegistry
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.SessionSync
import com.fittrainer.data.sync.SyncLogger
import com.fittrainer.di.ApplicationScope
import com.fittrainer.ui.account.password.ChangePasswordUiState
import com.fittrainer.ui.account.password.PasswordForm
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * La clave temporal (GX1-M1): el mismo [PasswordForm] de Cambiar contraseña, con la temporal como `current_password`.
 * Al guardar, el repositorio saca la marca de la sesión y la raíz pasa sola a las pestañas. Después se reengancha lo que
 * el bloqueo frenó: el push (el blanqueo borró los tokens y el alta del login dio 403) y la subida de sesiones pendientes
 * (la pasada cortó con 403 y las dejó en PENDING). Si alguno falla, no frena nada: el push se reintenta al rotar el
 * token o al volver a entrar, y la sync con la próxima sesión terminada o al abrir la app.
 */
@HiltViewModel
class ForcedPasswordViewModel @Inject constructor(
    repository: ProfileRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val pushTokens: PushTokenRegistry,
    private val sessionSync: SessionSync,
    private val syncLogger: SyncLogger,
    @param:ApplicationScope private val appScope: CoroutineScope,
) : ViewModel() {

    private val form = PasswordForm(viewModelScope, repository, sessionRepository, connectivity, onChanged = ::reconnect)

    val uiState: StateFlow<ChangePasswordUiState> = form.uiState

    init {
        // Vive con la actividad: con otra cuenta bloqueada (o al salir de la pantalla) no quedan las claves escritas.
        viewModelScope.launch {
            sessionRepository.session
                .map { (it as? Session.Student)?.user?.takeIf { user -> user.mustChangePassword }?.id }
                .distinctUntilChanged()
                .drop(1)
                .collect { form.reset() }
        }
    }

    fun onCurrent(value: String) = form.onCurrent(value)
    fun onNew(value: String) = form.onNew(value)
    fun onRepeat(value: String) = form.onRepeat(value)
    fun onSave() = form.onSave()

    private fun reconnect() {
        form.reset()
        // Independientes y con el alcance de la app: el push puede quedar esperando a FCM y no frena la sync, y ninguno
        // se corta si la pantalla se va. registerIfSignedIn no lanza: loguea y sigue.
        appScope.launch { enqueueSync() }
        appScope.launch { pushTokens.registerIfSignedIn() }
    }

    // newWork = true: si hay una pasada corriendo (que puede terminar con el 403 del bloqueo), la nueva va a
    // continuación (APPEND) en lugar de descartarse como con KEEP; si no, reemplaza a la que espera backoff.
    private suspend fun enqueueSync() {
        try {
            sessionSync.enqueue(newWork = true)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            syncLogger.enqueueFailed(e)
        }
    }
}
