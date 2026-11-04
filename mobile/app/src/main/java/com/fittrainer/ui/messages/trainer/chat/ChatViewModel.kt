package com.fittrainer.ui.messages.trainer.chat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.messages.trainer.MAX_MESSAGE_LENGTH
import com.fittrainer.data.messages.trainer.Message
import com.fittrainer.data.messages.trainer.StudentInactiveException
import com.fittrainer.data.messages.trainer.ThreadCache
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.messages.trainer.CHAT_LOADING_FAILED
import com.fittrainer.ui.messages.trainer.SEND_FAILED
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
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
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

const val CHAT_STUDENT_ARG = "studentId"

/** Cada cuánto se vuelve a pedir el chat con la pantalla abierta (como la web). */
const val CHAT_POLL_MS = 4_000L

/**
 * loaded: Room ya respondió. thread null con loaded: el chat nunca se bajó. inactive: el alumno está dado
 * de baja (409 al enviar). gone: la conversación ya no es del entrenador (403).
 */
data class ChatUiState(
    val loaded: Boolean = false,
    val name: String = "",
    val messages: List<Message> = emptyList(),
    val hasMore: Boolean = false,
    val everSynced: Boolean = false,
    val offline: Boolean = false,
    val sending: Boolean = false,
    val loadingOlder: Boolean = false,
    val notice: String? = null,
    val loadError: String? = null,
    val inactive: Boolean = false,
    val gone: Boolean = false,
) {
    fun canSend(draft: String): Boolean =
        !offline && !sending && !inactive && draft.isNotBlank() && draft.length <= MAX_MESSAGE_LENGTH
}

private data class Local(
    val sending: Boolean = false,
    val loadingOlder: Boolean = false,
    val notice: String? = null,
    val loadError: String? = null,
    val inactive: Boolean = false,
    val gone: Boolean = false,
)

/** Chat 1 a 1 del entrenador con un alumno (E11): Room, polling cada 4 s con la pantalla visible y leído al llegar. */
@HiltViewModel
class ChatViewModel @Inject constructor(
    private val repository: TrainerMessagesRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[CHAT_STUDENT_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(Local())
    private var polling: Job? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    private val thread = trainerId.filterNotNull().flatMapLatest { repository.observeThread(it, studentId) }
        .map<ThreadCache?, Pair<Boolean, ThreadCache?>> { true to it }.onStart { emit(false to null) }

    val uiState: StateFlow<ChatUiState> = combine(thread, connectivity.isOnline, local) { (loaded, t), online, l ->
        ChatUiState(
            loaded = loaded,
            name = t?.name.orEmpty(),
            messages = t?.messages.orEmpty(),
            hasMore = t?.hasMore ?: false,
            everSynced = t != null,
            offline = !online,
            sending = l.sending,
            loadingOlder = l.loadingOlder,
            notice = l.notice,
            loadError = l.loadError,
            inactive = l.inactive,
            gone = l.gone,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ChatUiState())

    /** Con la pantalla visible: refresca ya y cada 4 s. */
    fun onForeground() {
        if (polling?.isActive == true) return
        polling = viewModelScope.launch {
            while (isActive) {
                refreshOnce()
                delay(CHAT_POLL_MS)
            }
        }
    }

    fun onBackground() {
        polling?.cancel()
        polling = null
    }

    fun onRetry() {
        viewModelScope.launch { refreshOnce() }
    }

    /**
     * El texto de la caja vive en estado de Compose (sincrónico): si pasara por el StateFlow combinado,
     * al escribir rápido se perderían letras (lo que mostró el E2E en la difusión).
     */
    var draft by mutableStateOf("")
        private set

    fun onDraft(text: String) {
        draft = text
        if (local.value.notice != null) local.update { it.copy(notice = null) }
    }
    fun dismissNotice() = local.update { it.copy(notice = null) }

    /** Si falla por red, el texto queda en la caja. */
    fun onSend() {
        val state = uiState.value
        if (!state.canSend(draft)) return
        val text = draft
        local.update { it.copy(sending = true, notice = null) }
        viewModelScope.launch {
            val error = repository.send(trainerId.filterNotNull().first(), studentId, text).exceptionOrNull()
            local.update {
                when {
                    error == null -> it.copy(sending = false).also { if (draft == text) draft = "" }
                    error is StudentInactiveException -> it.copy(sending = false, inactive = true, notice = error.message)
                    (error as? DataException)?.error == DataError.NotFound -> it.copy(sending = false, gone = true)
                    else -> it.copy(sending = false, notice = SEND_FAILED)
                }
            }
        }
    }

    fun onLoadOlder() {
        if (local.value.loadingOlder || !uiState.value.hasMore) return
        local.update { it.copy(loadingOlder = true) }
        viewModelScope.launch {
            repository.loadOlder(trainerId.filterNotNull().first(), studentId)
            local.update { it.copy(loadingOlder = false) }
        }
    }

    /** Un refresco; si quedan mensajes del alumno sin leer, los marca leídos. */
    private suspend fun refreshOnce() {
        val id = trainerId.filterNotNull().first()
        val error = repository.refreshThread(id, studentId).exceptionOrNull()
        val kind = (error as? DataException)?.error
        local.update {
            when {
                error == null || kind == DataError.Offline -> it.copy(loadError = null)
                kind == DataError.NotFound -> it.copy(gone = true)
                else -> it.copy(loadError = CHAT_LOADING_FAILED)
            }
        }
        if (error != null) return
        val unread = repository.observeThread(id, studentId).first()?.messages.orEmpty().any { !it.fromTrainer && !it.read }
        if (unread) repository.markRead(id, studentId)
    }
}
