package com.fittrainer.ui.students.sessions.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.sessions.StudentSessionsRepository
import com.fittrainer.data.workout.history.HistoryDetail
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import com.fittrainer.ui.students.sessions.COMMENT_DELETED
import com.fittrainer.ui.students.sessions.COMMENT_FAILED
import com.fittrainer.ui.students.sessions.DETAIL_REFRESH_FAILED
import com.fittrainer.ui.students.sessions.COMMENT_SAVED
import com.fittrainer.ui.students.sessions.MAX_COMMENT
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
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

const val SESSION_ID_ARG = "sessionId"

/**
 * draft: lo que se ve en el campo (el guardado si el entrenador no lo tocó). loadError: el detalle no se
 * pudo actualizar por un error que no es de red (se ofrece reintentar). gone: la sesión ya no es visible
 * para el entrenador (403/404): es terminal, se avisa y se vuelve.
 */
data class StudentSessionDetailUiState(
    val loaded: Boolean = false,
    val detail: HistoryDetail? = null,
    val draft: String = "",
    val offline: Boolean = false,
    val saving: Boolean = false,
    val notice: String? = null,
    val loadError: String? = null,
    val gone: Boolean = false,
) {
    private val saved: String get() = detail?.trainerComment.orEmpty()
    val tooLong: Boolean get() = draft.length > MAX_COMMENT
    val canSave: Boolean get() = detail != null && !gone && !offline && !saving && !tooLong && draft.trim() != saved.trim() && draft.isNotBlank()
    val canDelete: Boolean get() = detail != null && !gone && !offline && !saving && saved.isNotBlank()
}

/** Detalle de una sesión del alumno y el comentario del entrenador (escritura online). */
@HiltViewModel
class StudentSessionDetailViewModel @Inject constructor(
    private val repository: StudentSessionsRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
) : ViewModel() {

    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val sessionId: String = checkNotNull(saved[SESSION_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val local = MutableStateFlow(Local())

    @OptIn(ExperimentalCoroutinesApi::class)
    private val detail = trainerId.filterNotNull()
        .flatMapLatest { repository.observeDetail(it, sessionId) }
        .map { Loaded(it) }
        .onStart { emit(Loaded(null, loaded = false)) }

    val uiState: StateFlow<StudentSessionDetailUiState> = combine(detail, connectivity.isOnline, local) { d, online, l ->
        StudentSessionDetailUiState(
            loaded = d.loaded,
            detail = d.detail,
            draft = l.draft ?: d.detail?.trainerComment.orEmpty(),
            offline = !online,
            saving = l.saving,
            notice = l.notice,
            loadError = l.loadError,
            gone = l.gone,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StudentSessionDetailUiState())

    /** Sin red no es un error (se ve lo guardado con el aviso de sin conexión). */
    fun onStart() {
        local.update { it.copy(loadError = null) }
        viewModelScope.launch {
            val error = repository.refreshDetail(trainerId.filterNotNull().first(), studentId, sessionId).exceptionOrNull()
            val kind = (error as? DataException)?.error
            local.update {
                when {
                    error == null || kind == DataError.Offline -> it
                    kind == DataError.NotFound -> it.copy(gone = true)
                    else -> it.copy(loadError = DETAIL_REFRESH_FAILED)
                }
            }
        }
    }

    fun onRetry() = onStart()

    fun onDraft(text: String) = local.update { it.copy(draft = text) }

    fun onSave() {
        if (uiState.value.canSave) send(uiState.value.draft, COMMENT_SAVED)
    }

    /** Borrar manda "" (el backend guarda null). */
    fun onDelete() {
        if (uiState.value.canDelete) send("", COMMENT_DELETED)
    }

    fun dismissNotice() = local.update { it.copy(notice = null) }

    /** Si el entrenador siguió escribiendo durante el envío, lo nuevo se conserva: solo se suelta el borrador enviado. */
    private fun send(text: String, okMessage: String) {
        val sent = local.value.draft
        local.update { it.copy(saving = true, notice = null) }
        viewModelScope.launch {
            val error = repository.saveComment(trainerId.filterNotNull().first(), studentId, sessionId, text).exceptionOrNull()
            local.update {
                when {
                    // Guardado: el texto vuelve a ser el de Room (ya recortado por el backend).
                    error == null -> it.copy(saving = false, draft = if (it.draft == sent) null else it.draft, notice = okMessage)
                    (error as? DataException)?.error == DataError.NotFound -> it.copy(saving = false, gone = true)
                    else -> it.copy(saving = false, notice = COMMENT_FAILED)
                }
            }
        }
    }

    private data class Loaded(val detail: HistoryDetail?, val loaded: Boolean = true)

    private data class Local(
        val draft: String? = null,
        val saving: Boolean = false,
        val notice: String? = null,
        val loadError: String? = null,
        val gone: Boolean = false,
    )
}
