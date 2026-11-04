package com.fittrainer.ui.messages.student.chat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.messages.photo.PhotoReader
import com.fittrainer.data.messages.trainer.PhotoRejectedException
import com.fittrainer.data.messages.trainer.StudentInactiveException
import com.fittrainer.data.messages.trainer.ThreadCache
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.messages.student.PHOTO_READ_FAILED
import com.fittrainer.ui.messages.student.PHOTO_REJECTED
import com.fittrainer.ui.messages.student.STUDENT_CHAT_FAILED
import com.fittrainer.ui.messages.student.STUDENT_INACTIVE
import com.fittrainer.ui.messages.trainer.CHAT_LOADING_FAILED
import com.fittrainer.ui.messages.trainer.SEND_FAILED
import com.fittrainer.ui.messages.trainer.chat.CHAT_POLL_MS
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

/**
 * El chat del alumno con su PT (tarjeta 18): misma caché que el del PT, con el alumno como dueño y como
 * conversación. Polling cada 4 s con la pantalla visible y leído al llegar. Enviar (texto o foto) es solo online; el
 * borrador (texto y foto) vive en [SavedStateHandle], así sobrevive a que Android mate el proceso.
 */
@HiltViewModel
class StudentChatViewModel @Inject constructor(
    private val repository: TrainerMessagesRepository,
    private val photos: PhotoReader,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val saved: SavedStateHandle,
) : ViewModel() {

    private val studentId = sessionRepository.session.map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(StudentChatLocal(photo = saved[PHOTO_KEY]))
    private var polling: Job? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    private val thread = studentId.filterNotNull().flatMapLatest { repository.observeThread(it, it) }
        .map<ThreadCache?, Pair<Boolean, ThreadCache?>> { true to it }.onStart { emit(false to null) }

    val uiState: StateFlow<StudentChatUiState> = combine(thread, connectivity.isOnline, local) { (loaded, t), online, l ->
        StudentChatUiState(
            loaded = loaded,
            trainerName = t?.name.orEmpty(),
            messages = t?.messages.orEmpty(),
            hasMore = t?.hasMore ?: false,
            everSynced = t != null,
            offline = !online,
            sending = l.sending,
            loadingOlder = l.loadingOlder,
            photo = l.photo,
            notice = l.notice,
            loadError = l.loadError,
            inactive = l.inactive,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StudentChatUiState())

    /** El texto de la caja, en estado de Compose (sincrónico) para no perder letras al escribir rápido (como E11). */
    var draft by mutableStateOf(saved[DRAFT_KEY] ?: "")
        private set

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

    fun onDraft(text: String) {
        updateDraft(text)
        if (local.value.notice != null) local.update { it.copy(notice = null) }
    }

    fun onPhotoPicked(uri: String) = setPhoto(uri)
    fun onRemovePhoto() = setPhoto(null)
    fun onNotice(text: String) = local.update { it.copy(notice = text) }
    fun dismissNotice() = local.update { it.copy(notice = null) }

    /**
     * Con foto, el texto va de epígrafe. Si falla por red, el texto y la foto quedan para reintentar. Al terminar se
     * limpian solo el texto y la foto que se mandaron: si el alumno eligió otra en el medio, queda.
     */
    fun onSend() {
        if (!uiState.value.canSend(draft)) return
        val text = draft
        val photo = local.value.photo
        local.update { it.copy(sending = true, notice = null) }
        viewModelScope.launch {
            val id = studentId.filterNotNull().first()
            val error = if (photo == null) {
                repository.send(id, id, text).exceptionOrNull()
            } else {
                val jpeg = photos.jpeg(photo)
                if (jpeg == null) {
                    clearPhotoIf(photo)
                    local.update { it.copy(sending = false, notice = PHOTO_READ_FAILED) }
                    return@launch
                }
                repository.sendPhoto(id, id, jpeg, text).exceptionOrNull()
            }
            if (error == null && draft == text) updateDraft("")
            if (error == null || error is PhotoRejectedException) clearPhotoIf(photo)
            local.update {
                when {
                    error == null -> it.copy(sending = false)
                    error is PhotoRejectedException -> it.copy(sending = false, notice = PHOTO_REJECTED)
                    error is StudentInactiveException -> it.copy(sending = false, inactive = true, notice = STUDENT_INACTIVE)
                    else -> it.copy(sending = false, notice = SEND_FAILED)
                }
            }
        }
    }

    fun onLoadOlder() {
        if (local.value.loadingOlder || !uiState.value.hasMore) return
        local.update { it.copy(loadingOlder = true) }
        viewModelScope.launch {
            val id = studentId.filterNotNull().first()
            repository.loadOlder(id, id)
            local.update { it.copy(loadingOlder = false) }
        }
    }

    private fun updateDraft(text: String) {
        draft = text
        saved[DRAFT_KEY] = text
    }

    private fun setPhoto(uri: String?) {
        saved[PHOTO_KEY] = uri
        local.update { it.copy(photo = uri, notice = if (uri != null) null else it.notice) }
    }

    /** Saca la foto solo si sigue siendo [sent] (la que se mandó). */
    private fun clearPhotoIf(sent: String?) {
        if (sent != null && local.value.photo == sent) setPhoto(null)
    }

    /** Un refresco; si quedan mensajes del PT sin leer, los marca leídos. */
    private suspend fun refreshOnce() {
        val id = studentId.filterNotNull().first()
        val error = repository.refreshThread(id, id).exceptionOrNull()
        val kind = (error as? DataException)?.error
        local.update {
            when {
                error == null || kind == DataError.Offline -> it.copy(loadError = null)
                kind == DataError.NotFound -> it.copy(loadError = STUDENT_CHAT_FAILED)
                else -> it.copy(loadError = CHAT_LOADING_FAILED)
            }
        }
        if (error != null) return
        val unread = repository.observeThread(id, id).first()?.messages.orEmpty().any { it.fromTrainer && !it.read }
        if (unread) repository.markRead(id, id)
    }
}

private const val DRAFT_KEY = "draft"
private const val PHOTO_KEY = "photo"
