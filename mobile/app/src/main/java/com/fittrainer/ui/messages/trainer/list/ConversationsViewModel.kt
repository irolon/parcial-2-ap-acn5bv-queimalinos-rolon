package com.fittrainer.ui.messages.trainer.list

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.messages.trainer.Conversation
import com.fittrainer.data.messages.trainer.ConversationsCache
import com.fittrainer.data.messages.trainer.MAX_BROADCAST
import com.fittrainer.data.messages.trainer.MAX_MESSAGE_LENGTH
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.messages.trainer.BROADCAST_FAILED
import com.fittrainer.ui.messages.trainer.BROADCAST_STALE
import com.fittrainer.ui.messages.trainer.MESSAGES_REFRESH_FAILED
import com.fittrainer.ui.messages.trainer.broadcastSent
import com.fittrainer.ui.students.STUDENTS_OFFLINE_ERROR
import com.fittrainer.ui.students.syncedAgo
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.Instant
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
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** La hoja de difusión: los elegidos, el texto y el error del último intento. */
data class BroadcastState(val selected: Set<String> = emptySet(), val sending: Boolean = false, val error: String? = null) {
    fun canSend(text: String): Boolean =
        !sending && selected.isNotEmpty() && selected.size <= MAX_BROADCAST && text.isNotBlank() && text.length <= MAX_MESSAGE_LENGTH
}

/** loaded: Room ya respondió. everSynced: la lista se bajó alguna vez. notice: el resultado de la última difusión. */
data class ConversationsUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val conversations: List<Conversation> = emptyList(),
    val now: Instant = Instant.EPOCH,
    val syncedLabel: String? = null,
    val offline: Boolean = false,
    val refreshing: Boolean = false,
    val error: String? = null,
    val broadcast: BroadcastState? = null,
    val notice: String? = null,
) {
    val showErrorScreen: Boolean get() = loaded && !everSynced && error != null && !refreshing
}

private data class Local(val refreshing: Boolean = false, val error: String? = null, val broadcast: BroadcastState? = null, val notice: String? = null)

/** Pestaña Mensajes del entrenador (E11): conversaciones de Room, refresco al entrar y con pull, y la difusión. */
@HiltViewModel
class ConversationsViewModel @Inject constructor(
    private val repository: TrainerMessagesRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(Local())

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = trainerId.filterNotNull().flatMapLatest { repository.observeConversations(it) }
        .map<ConversationsCache?, Pair<Boolean, ConversationsCache?>> { true to it }.onStart { emit(false to null) }

    val uiState: StateFlow<ConversationsUiState> = combine(cache, connectivity.isOnline, local) { (loaded, c), online, l ->
        val now = clock.instant()
        ConversationsUiState(
            loaded = loaded,
            everSynced = c != null,
            conversations = c?.conversations.orEmpty(),
            now = now,
            syncedLabel = c?.let { syncedAgo(it.fetchedAt, now) },
            offline = !online,
            refreshing = l.refreshing,
            error = l.error,
            broadcast = l.broadcast,
            notice = l.notice,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ConversationsUiState())

    fun onStart() = refresh()
    fun onPullToRefresh() = refresh()
    fun onRetry() = refresh()
    fun dismissError() = local.update { it.copy(error = null) }
    fun dismissNotice() = local.update { it.copy(notice = null) }

    /** El texto de la difusión, en estado de Compose (sincrónico) por lo mismo que la caja del chat. */
    var broadcastText by mutableStateOf("")
        private set

    fun openBroadcast() {
        broadcastText = ""
        local.update { it.copy(broadcast = BroadcastState()) }
    }
    fun closeBroadcast() = local.update { if (it.broadcast?.sending == true) it else it.copy(broadcast = null) }
    fun onBroadcastText(text: String) {
        if (local.value.broadcast?.sending == true) return
        broadcastText = text
        if (local.value.broadcast?.error != null) editBroadcast { it.copy(error = null) }
    }
    fun onToggle(studentId: String) = editBroadcast { b ->
        b.copy(selected = if (studentId in b.selected) b.selected - studentId else b.selected + studentId, error = null)
    }

    /** Todos elegidos → ninguno; si no, todos los de la lista. */
    fun onToggleAll() = editBroadcast { b ->
        val all = uiState.value.conversations.map { it.studentId }.toSet()
        b.copy(selected = if (b.selected.containsAll(all)) emptySet() else all, error = null)
    }

    fun onSendBroadcast() {
        val text = broadcastText
        val b = local.value.broadcast?.takeIf { it.canSend(text) } ?: return
        local.update { it.copy(broadcast = b.copy(sending = true, error = null)) }
        viewModelScope.launch {
            val id = trainerId.filterNotNull().first()
            val result = repository.broadcast(id, b.selected.toList(), text)
            result.onSuccess { sent ->
                local.update { it.copy(broadcast = null, notice = broadcastSent(sent)) }
                repository.refreshConversations(id)
            }.onFailure { e ->
                val stale = (e as? DataException)?.error == DataError.NotFound
                local.update { it.copy(broadcast = b.copy(sending = false, selected = if (stale) emptySet() else b.selected, error = if (stale) BROADCAST_STALE else BROADCAST_FAILED)) }
                if (stale) repository.refreshConversations(id)
            }
        }
    }

    private fun editBroadcast(change: (BroadcastState) -> BroadcastState) = local.update { l ->
        val b = l.broadcast?.takeIf { !it.sending } ?: return@update l
        l.copy(broadcast = change(b))
    }

    private fun refresh() {
        if (local.value.refreshing) return
        viewModelScope.launch {
            val id = trainerId.filterNotNull().first()
            local.update { it.copy(refreshing = true) }
            val error = repository.refreshConversations(id).exceptionOrNull()
            val text = when {
                error == null -> null
                (error as? DataException)?.error == DataError.Offline -> STUDENTS_OFFLINE_ERROR
                else -> MESSAGES_REFRESH_FAILED
            }
            local.update { it.copy(refreshing = false, error = text) }
        }
    }
}
