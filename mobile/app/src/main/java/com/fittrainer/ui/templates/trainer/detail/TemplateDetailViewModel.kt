package com.fittrainer.ui.templates.trainer.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.TrainerStudent
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.data.templates.trainer.TemplateDetail
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import com.fittrainer.ui.templates.trainer.assign.AssignDone
import com.fittrainer.ui.templates.trainer.assign.AssignState
import com.fittrainer.ui.templates.trainer.assign.AssignTemplateController
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
import kotlinx.coroutines.launch

const val TEMPLATE_ID_ARG = "templateId"

/** students: los activos, para elegir a quién asignarla. fixedStudent: el de la ficha, si se llegó desde ahí. */
data class TemplateDetailUiState(
    val loaded: Boolean = false,
    val detail: TemplateDetail? = null,
    val offline: Boolean = false,
    val gone: Boolean = false,
    val students: List<TrainerStudent> = emptyList(),
    val fixedStudent: TrainerStudent? = null,
    val assign: AssignState? = null,
    val done: AssignDone? = null,
)

/** Detalle de una plantilla (E9) y su asignación a un alumno. */
@HiltViewModel
class TemplateDetailViewModel @Inject constructor(
    private val repository: TrainerTemplatesRepository,
    routines: TrainerRoutinesRepository,
    students: TrainerStudentsRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    saved: SavedStateHandle,
) : ViewModel() {

    private val templateId: String = checkNotNull(saved[TEMPLATE_ID_ARG])
    private val studentId: String? = saved[STUDENT_ID_ARG]
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val gone = MutableStateFlow(false)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val controller = AssignTemplateController(
        repository, routines, viewModelScope,
        trainerId = { trainerId.filterNotNull().first() },
        isOffline = { !online.value },
        onGone = { gone.value = true },
    )

    @OptIn(ExperimentalCoroutinesApi::class)
    private val detail = trainerId.filterNotNull().flatMapLatest { repository.observeTemplate(it, templateId) }
        .map<TemplateDetail?, Pair<Boolean, TemplateDetail?>> { true to it }
        .onStart { emit(false to null) }

    @OptIn(ExperimentalCoroutinesApi::class)
    private val active = trainerId.filterNotNull().flatMapLatest { students.observe(it) }
        .map { cache -> cache.students.filter { it.active }.sortedBy { it.name.lowercase() } }
        .onStart { emit(emptyList()) }

    private val flags = combine(online, gone, controller.state, controller.done) { o, g, a, d -> Flags(!o, g, a, d) }

    val uiState: StateFlow<TemplateDetailUiState> = combine(detail, active, flags) { d, list, f ->
        TemplateDetailUiState(
            loaded = d.first, detail = d.second, offline = f.offline, gone = f.gone, students = list,
            fixedStudent = studentId?.let { id -> list.firstOrNull { it.id == id } },
            assign = f.assign, done = f.done,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, TemplateDetailUiState())

    fun onStart() {
        viewModelScope.launch {
            val error = repository.refreshTemplate(trainerId.filterNotNull().first(), templateId).exceptionOrNull()
            if ((error as? DataException)?.error == DataError.NotFound) gone.value = true
        }
    }

    /** "Asignar a un alumno" (o "Asignar a <nombre>" si se llegó desde la ficha). */
    fun onAssign() {
        val state = uiState.value
        controller.open(state.detail ?: return, state.fixedStudent)
    }

    fun onPickStudent() = controller.onPickStudent()
    fun onSelectStudent(student: TrainerStudent) = controller.select(student)
    fun onNameChange(name: String) = controller.onNameChange(name)
    fun onToggleDay(day: String) = controller.onToggleDay(day)
    fun onToggleDeactivate(on: Boolean) = controller.onToggleDeactivate(on)
    fun onSubmit() = controller.submit(templateId)
    fun onDismissAssign() = controller.dismiss()
    fun onRetryPrevious() = controller.retryPrevious()

    /** La pantalla ya navegó al editor: el evento no se repite al volver. */
    fun onDoneHandled() = controller.consumeDone()

    private data class Flags(val offline: Boolean, val gone: Boolean, val assign: AssignState?, val done: AssignDone?)
}
