package com.fittrainer.ui.refresh

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** isRefreshing: hay un pedido en vuelo. notice: aviso suave del último pull-to-refresh fallido. */
data class RefreshState(val isRefreshing: Boolean = false, val notice: String? = null)

/**
 * Refresco en segundo plano de una pantalla que lee de Room: al quedar visible, al volver la red y con
 * pull-to-refresh. Nunca dos pedidos a la red a la vez desde la misma pantalla. Lo usan Hoy y Mis rutinas.
 * [online] tiene que repetir el último valor (replay = 1): el primero es el estado actual, no un cambio.
 */
class RefreshController(
    private val scope: CoroutineScope,
    private val online: SharedFlow<Boolean>,
    private val ownerId: Flow<String?>,
    private val failureNotice: String,
    private val fetch: suspend (String) -> Result<Unit>,
) {
    private val _state = MutableStateFlow(RefreshState())
    val state: StateFlow<RefreshState> = _state.asStateFlow()
    private var job: Job? = null
    private var manualRequested = false
    private var waitingToRetry = false

    init {
        // drop(1): el estado al suscribirse no es un cambio.
        scope.launch {
            online.drop(1).collect { isOnline ->
                when {
                    // Volvió la red: lo que estaba en vuelo salió por la red vieja (muerta). Se cancela y se arranca otro.
                    isOnline -> refresh(manual = false, restart = true)
                    // Se cortó la red mientras se esperaba para reintentar: no tiene sentido seguir.
                    waitingToRetry -> {
                        job?.cancel()
                        waitingToRetry = false
                    }
                }
            }
        }
    }

    /** La pantalla quedó visible (al entrar o al volver la app al frente). */
    fun start() = refresh(manual = false)

    fun pull() = refresh(manual = true)

    fun dismissNotice() = _state.update { it.copy(notice = null) }

    /**
     * Si ya hay un pedido en vuelo, un pull lo marca como manual (para que avise si falla) y no arranca otro.
     * Si solo se está esperando para reintentar, se arranca ya.
     */
    private fun refresh(manual: Boolean, restart: Boolean = false) {
        if (job?.isActive == true) {
            if (!restart && !waitingToRetry) {
                if (manual) manualRequested = true
                return
            }
            job?.cancel()
            manualRequested = manual || (restart && manualRequested)
        } else {
            manualRequested = manual
        }
        waitingToRetry = false
        job = scope.launch { run() }
    }

    /** Solo el refresco manual avisa si falla; el automático muestra lo que hay en Room sin alarmar. */
    private suspend fun run() {
        val owner = ownerId.filterNotNull().first()
        _state.update { it.copy(isRefreshing = true, notice = null) }
        var result = fetch(owner)
        for (wait in AUTO_RETRY_DELAYS_MS) {
            if (!shouldRetry(result)) break
            // La red recién vuelta puede no estar lista todavía (DNS, Wi-Fi sin validar): se reintenta.
            _state.update { it.copy(isRefreshing = false) }
            waitingToRetry = true
            delay(wait)
            waitingToRetry = false
            _state.update { it.copy(isRefreshing = true) }
            result = fetch(owner)
        }
        _state.value = RefreshState(notice = if (manualRequested && result.isFailure) failureNotice else null)
    }

    private suspend fun shouldRetry(result: Result<Unit>): Boolean {
        val offline = (result.exceptionOrNull() as? DataException)?.error == DataError.Offline
        return offline && !manualRequested && online.first()
    }

    private companion object {
        /** Reintentos del refresco automático que falla por red con el teléfono diciendo que hay red. */
        val AUTO_RETRY_DELAYS_MS = listOf(2_000L, 5_000L)
    }
}
