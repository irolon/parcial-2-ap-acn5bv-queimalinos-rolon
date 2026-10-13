package com.fittrainer.ui.health

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.HealthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class HealthViewModel @Inject constructor(
    private val repository: HealthRepository,
) : ViewModel() {

    private val refresh = MutableStateFlow(RefreshState())

    val uiState: StateFlow<HealthUiState> =
        combine(repository.observe(), refresh) { snapshot, r ->
            HealthUiState(snapshot = snapshot, isRefreshing = r.isRefreshing, error = r.error)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HealthUiState(isRefreshing = true))

    init {
        retry()
    }

    /** Vuelve a pedir /health. Si ya hay un refresh en curso, no hace nada. */
    fun retry() {
        if (refresh.value.isRefreshing) return
        // Se conserva el error previo mientras refresca: el banner offline no parpadea.
        refresh.update { it.copy(isRefreshing = true) }
        viewModelScope.launch {
            val result = repository.refresh()
            refresh.value = RefreshState(error = result.exceptionOrNull()?.let(::toMessage))
        }
    }

    private fun toMessage(error: Throwable): String = when (val e = (error as? DataException)?.error) {
        DataError.Offline -> "Sin conexión con el servidor"
        is DataError.Http -> "El servidor respondió con error ${e.code}"
        else -> "No se pudo actualizar el estado del servidor"
    }

    private data class RefreshState(val isRefreshing: Boolean = false, val error: String? = null)
}
