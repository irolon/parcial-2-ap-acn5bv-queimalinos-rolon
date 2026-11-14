package com.fittrainer.ui.gamification.celebration

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.gamification.Celebration
import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Celebraciones del alumno (spec §3.4 y §4.4). Mientras la app está abierta, cada cambio de la foto o de las sesiones
 * terminadas vuelve a evaluar la cuenta local: así cubre el cierre desde la pantalla y desde la notificación.
 */
@HiltViewModel
class CelebrationViewModel @Inject constructor(
    private val repository: GamificationRepository,
    sessionRepository: SessionRepository,
) : ViewModel() {

    private val ownerId = sessionRepository.session.map { (it as? Session.Student)?.user?.id }.distinctUntilChanged()
    private val currentOwner: StateFlow<String?> = ownerId.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    @OptIn(ExperimentalCoroutinesApi::class)
    val pending: StateFlow<List<Celebration>> = ownerId
        .flatMapLatest { id -> id?.let(repository::observePending) ?: flowOf(emptyList()) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        viewModelScope.launch {
            @OptIn(ExperimentalCoroutinesApi::class)
            ownerId.flatMapLatest { id -> id?.let { repository.evaluationTriggers(it).map { _ -> id } } ?: flowOf(null) }
                .collectLatest { id -> id?.let { repository.evaluateLocal(it) } }
        }
    }

    /** "Seguir": lo mostrado queda visto (no vuelve a salir). */
    fun onShown(codes: List<String>) {
        val id = currentOwner.value ?: return
        viewModelScope.launch { repository.markShown(id, codes) }
    }
}
