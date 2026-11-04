package com.fittrainer.ui.messages.trainer.badge

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** Cada cuánto se vuelve a pedir la lista con la app en primer plano (como la web). */
const val BADGE_POLL_MS = 15_000L

/**
 * El globito de la pestaña Mensajes (E11): la suma de no leídos de Room. Con la app en primer plano
 * refresca la lista cada 15 s, además del push de mensaje (#70); un refresco fallido deja lo guardado.
 */
@HiltViewModel
class MessagesBadgeViewModel @Inject constructor(
    private val repository: TrainerMessagesRepository,
    sessionRepository: SessionRepository,
) : ViewModel() {

    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private var polling: Job? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    val unread: StateFlow<Int> = trainerId.filterNotNull().flatMapLatest { repository.observeUnread(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    fun onForeground() {
        if (polling?.isActive == true) return
        polling = viewModelScope.launch {
            val id = trainerId.filterNotNull().first()
            while (isActive) {
                repository.refreshConversations(id)
                delay(BADGE_POLL_MS)
            }
        }
    }

    fun onBackground() {
        polling?.cancel()
        polling = null
    }
}
