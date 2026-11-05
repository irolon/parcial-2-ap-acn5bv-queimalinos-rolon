package com.fittrainer.ui.messages.student.badge

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.messages.trainer.badge.BADGE_POLL_MS
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * El globito de la pestaña Mensajes del alumno (tarjeta 18): los mensajes del PT sin leer que hay en Room. Con la
 * app en primer plano refresca el chat cada 15 s, además del push de mensaje (#70); un refresco fallido deja lo guardado.
 */
@HiltViewModel
class StudentMessagesBadgeViewModel @Inject constructor(
    private val repository: TrainerMessagesRepository,
    sessionRepository: SessionRepository,
) : ViewModel() {

    private val studentId = sessionRepository.session.map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private var polling: Job? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    val unread: StateFlow<Int> = studentId.filterNotNull()
        .flatMapLatest { id -> repository.observeThread(id, id).map { t -> t?.messages.orEmpty().count { it.fromTrainer && !it.read } } }
        .distinctUntilChanged()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    fun onForeground() {
        if (polling?.isActive == true) return
        polling = viewModelScope.launch {
            val id = studentId.filterNotNull().first()
            while (isActive) {
                repository.refreshThread(id, id)
                delay(BADGE_POLL_MS)
            }
        }
    }

    fun onBackground() {
        polling?.cancel()
        polling = null
    }
}
