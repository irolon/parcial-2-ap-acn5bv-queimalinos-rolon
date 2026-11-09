package com.fittrainer.ui.workout.aichat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.chat.AiChatError
import com.fittrainer.data.chat.AiChatException
import com.fittrainer.data.chat.AiChatQuota
import com.fittrainer.data.chat.AiChatRepository
import com.fittrainer.data.chat.AiChatToday
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
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

/** Un aviso con el día de Argentina en que vale (null: siempre); a la medianoche caduca, como el cupo. */
private data class AiChatNotice(val text: String, val day: LocalDate?)

/** quota: el último cupo que dio el servidor, con su día (pasada la medianoche no vale para el día nuevo). */
private data class AiChatLocal(val sending: Boolean = false, val quota: AiChatQuota? = null, val notice: AiChatNotice? = null)

/**
 * La hoja del asistente IA en la sesión activa (tarjeta 14). Lee la conversación del día de Room y la refresca al
 * abrirse; preguntar es solo con red y de a una. El borrador vive en [SavedStateHandle]. La sesión no se toca: el
 * reemplazo de una sugerencia lo hace WorkoutViewModel con el ejercicio que resuelve [onReplaceSuggestion].
 */
@HiltViewModel
class AiChatViewModel @Inject constructor(
    private val repository: AiChatRepository,
    private val library: LibraryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val saved: SavedStateHandle,
) : ViewModel() {

    private val ownerId = sessionRepository.session.map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val local = MutableStateFlow(AiChatLocal())
    private var resolving: Job? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    private val today = ownerId.filterNotNull().flatMapLatest { repository.observeToday(it) }.map<AiChatToday, AiChatToday?> { it }
        .onStart { emit(null) }

    val uiState: StateFlow<AiChatUiState> = combine(today, online, local) { t, on, l ->
        val remaining = l.quota?.takeIf { it.day == t?.day }?.remaining
        val notice = l.notice?.takeIf { it.day == null || it.day == t?.day }?.text
        AiChatUiState(t?.messages.orEmpty(), !on, l.sending, remaining, notice, t?.day)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AiChatUiState())

    var draft by mutableStateOf(TextFieldValue(saved[DRAFT_KEY] ?: ""))
        private set

    /** Al abrir la hoja: trae el día del servidor. Si falla (sin red) se ve lo que ya había en Room. */
    fun onOpen() {
        viewModelScope.launch {
            repository.refresh(owner()).onSuccess { q -> local.update { it.copy(quota = q) } }
        }
    }

    fun onDraft(value: TextFieldValue) {
        val text = value.text.take(MAX_MESSAGE_LENGTH)
        updateDraft(if (text == value.text) value else TextFieldValue(text, TextRange(text.length)))
        dismissNotice()
    }

    fun onPainChip(exerciseName: String) = updateDraft(TextFieldValue(painTemplate(exerciseName), TextRange(PAIN_CURSOR)))

    /** Lo dictado se suma al final de la caja; no se envía solo. */
    fun onDictated(text: String) {
        val current = draft.text.trimEnd()
        val joined = (if (current.isEmpty()) text.trim() else "$current ${text.trim()}").take(MAX_MESSAGE_LENGTH)
        updateDraft(TextFieldValue(joined, TextRange(joined.length)))
    }

    fun onChip(question: String, target: AiChatTarget) = ask(question, target, fromDraft = false)

    fun onSend(target: AiChatTarget) = ask(draft.text.trim(), target, fromDraft = true)

    /**
     * Busca el ejercicio en la biblioteca de Room; si no está, la refresca una vez. Si sigue sin estar, avisa. De a
     * una búsqueda: un segundo toque mientras tanto no hace nada.
     */
    fun onReplaceSuggestion(exerciseId: String, onResolved: (LibraryExercise) -> Unit) {
        if (resolving?.isActive == true) return
        resolving = viewModelScope.launch {
            val id = owner()
            val found = find(id, exerciseId) ?: library.refresh(id).let { find(id, exerciseId) }
            if (found != null) onResolved(found) else showNotice(AI_SUGGESTION_MISSING)
        }
    }

    /**
     * La hoja se cerró. El ViewModel vive con la sesión, no con la hoja: una búsqueda de sugerencia en curso se
     * cancela para no reemplazar después el ejercicio que el alumno tenga en ese momento.
     */
    fun onClose() {
        resolving?.cancel()
        resolving = null
    }

    fun dismissNotice() {
        if (local.value.notice != null) local.update { it.copy(notice = null) }
    }

    /** Un aviso de la pantalla (p. ej. «Reemplazar» bloqueado en una sugerencia). */
    fun showNotice(text: String) = local.update { it.copy(notice = AiChatNotice(text, uiState.value.day)) }

    private fun ask(text: String, target: AiChatTarget, fromDraft: Boolean) {
        val l = local.value
        if (text.isBlank() || l.sending || !online.value || uiState.value.limitReached) return
        // El día de la consulta: un tope o un error que llegan pasada la medianoche son de ese día, no del nuevo.
        val askedDay = uiState.value.day
        local.update { it.copy(sending = true, notice = null) }
        viewModelScope.launch {
            val result = repository.send(owner(), text, target.sessionId, target.exerciseId)
            result.onSuccess { quota ->
                if (fromDraft && draft.text.trim() == text) updateDraft(TextFieldValue(""))
                local.update { it.copy(sending = false, quota = quota) }
            }
            result.onFailure { e ->
                val error = (e as? AiChatException)?.error ?: AiChatError.Unknown
                local.update {
                    it.copy(
                        sending = false,
                        notice = AiChatNotice(aiChatErrorText(error), askedDay),
                        quota = if (error == AiChatError.DailyLimit) askedDay?.let { d -> AiChatQuota(0, d) } else it.quota,
                    )
                }
            }
        }
    }

    private suspend fun find(ownerId: String, exerciseId: String): LibraryExercise? =
        library.observeCache(ownerId).first().exercises.firstOrNull { it.id == exerciseId }

    private suspend fun owner(): String = ownerId.filterNotNull().first()

    private fun updateDraft(value: TextFieldValue) {
        draft = value
        saved[DRAFT_KEY] = value.text
    }
}

private const val DRAFT_KEY = "ai_chat_draft"
