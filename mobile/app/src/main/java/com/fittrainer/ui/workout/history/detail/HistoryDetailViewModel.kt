package com.fittrainer.ui.workout.history.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.history.HistoryDetail
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.data.workout.history.HistoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Antes de la primera emisión de Room: `detail == null` y `missing == false` (no se muestra "no encontramos"). */
data class HistoryDetailUiState(
    val detail: HistoryDetail? = null,
    val isOffline: Boolean = false,
    val loading: Boolean = true,
    val missing: Boolean = false,
    val error: Boolean = false,
)

/** Detalle de una sesión (tarjeta 12). Si no tiene el detalle guardado (las de "Ver más"), lo pide una vez con red. */
@HiltViewModel
class HistoryDetailViewModel @Inject constructor(
    handle: SavedStateHandle,
    private val repository: HistoryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {
    private val sessionId: String = checkNotNull(handle["sessionId"])
    private val owner = sessionRepository.session.map { (it as? Session.Student)?.user?.id }
    private val loading = MutableStateFlow(false)
    private val error = MutableStateFlow(false)
    private var requested = false
    private var ownerId: String? = null
    private var lastMarked: String? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<HistoryDetailUiState> =
        combine(
            owner.filterNotNull().flatMapLatest { id -> repository.observeDetail(id, sessionId).map { d -> id to d } },
            connectivity.isOnline,
            loading,
            error,
        ) { (id, d), online, l, err ->
            ownerId = id
            // Sin red el error ya no vale: al volver la conexión se reintenta solo.
            if (!online && err) error.value = false
            if (d != null && !d.detailLoaded && d.item.origin == HistoryOrigin.SERVER && online && !requested && !err) fetch(id)
            HistoryDetailUiState(d, isOffline = !online, loading = l, missing = d == null, error = err)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HistoryDetailUiState())

    /**
     * La pantalla muestra ese comentario (solo se llama con el detalle a la vista): queda leído, una vez por texto.
     * Nada lo marca por su cuenta: con la pantalla en otra pestaña el VM sigue vivo pero no se vio nada.
     */
    fun onCommentShown(comment: String) {
        if (comment.isBlank() || comment == lastMarked) return
        lastMarked = comment
        viewModelScope.launch {
            val id = owner.filterNotNull().first()
            repository.markCommentSeen(id, sessionId, comment)
        }
    }

    /** "Reintentar" tras un error: un pedido más. */
    fun retry() {
        val id = ownerId ?: return
        if (loading.value) return
        fetch(id)
    }

    private fun fetch(ownerId: String) {
        requested = true
        error.value = false
        viewModelScope.launch {
            loading.value = true
            val ok = repository.loadDetail(ownerId, sessionId).isSuccess
            requested = ok
            error.value = !ok
            loading.value = false
        }
    }
}
