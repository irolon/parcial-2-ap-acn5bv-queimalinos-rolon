package com.fittrainer.ui.progress.charts

import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Refrescos de Progreso → Gráficos por clave ([ChartsKeys]): nunca dos de lo mismo a la vez. Por clave anota si corre,
 * si falló (banner) y si ya terminó alguno (sin datos → falla en la sección, no una carga eterna).
 */
internal class ChartsRefreshes(private val scope: CoroutineScope, private val isOnline: () -> Boolean) {

    data class State(val running: Set<String> = emptySet(), val failed: Set<String> = emptySet(), val attempted: Set<String> = emptySet()) {
        fun flags(key: String?): RefreshFlags =
            if (key == null) RefreshFlags() else RefreshFlags(key in running, key in failed, key in attempted)
    }

    private val mutableState = MutableStateFlow(State())
    val state: StateFlow<State> = mutableState.asStateFlow()
    private val jobs = mutableMapOf<String, Job>()

    fun launch(key: String, block: suspend () -> Result<Unit>) {
        if (jobs[key]?.isActive == true) return
        jobs[key] = scope.launch {
            mutableState.update { it.copy(running = it.running + key) }
            val cause = block().exceptionOrNull()
            // Sin red no es un error (se ve lo guardado con el aviso de "sin conexión"); un cambio de cuenta tampoco.
            // Pero un "Offline" con la conectividad diciendo que hay red es el backend inalcanzable: eso sí es falla.
            val offline = (cause as? DataException)?.error == DataError.Offline && !isOnline()
            val failed = cause != null && !offline && cause.cause !is AccountChangedException
            mutableState.update {
                it.copy(running = it.running - key, failed = if (failed) it.failed + key else it.failed - key, attempted = it.attempted + key)
            }
        }
    }

    /** Cerrar el banner: los errores de esas claves dejan de mostrarse hasta el próximo intento. */
    fun dismiss(vararg keys: String?) = mutableState.update { it.copy(failed = it.failed - keys.filterNotNull().toSet()) }
}
