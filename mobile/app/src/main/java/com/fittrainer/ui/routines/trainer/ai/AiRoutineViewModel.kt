package com.fittrainer.ui.routines.trainer.ai

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.data.trainerai.MAX_TEMPLATE_NAME
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.toTrainerAiError
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignController
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignProgress
import com.fittrainer.ui.routines.trainer.create.PREVIOUS_UNKNOWN
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
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
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val FORM_KEY = "ai_form"
private const val PROPOSAL_KEY = "ai_proposal"
private val json = Json { ignoreUnknownKeys = true }

/** "Rutina con IA" (E15): formulario precargado de la ficha → propuesta → "Guardar y asignar". */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class AiRoutineViewModel @Inject constructor(
    private val ai: TrainerAiRepository,
    templates: TrainerTemplatesRepository,
    private val routines: TrainerRoutinesRepository,
    details: TrainerStudentDetailRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
    private val saved: SavedStateHandle,
) : ViewModel() {
    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private suspend fun trainer() = trainerId.filterNotNull().first()

    private val form = MutableStateFlow(saved.get<String>(FORM_KEY)?.let { json.decodeFromString<AiRoutineForm>(it) } ?: AiRoutineForm())
    private val proposal = MutableStateFlow(saved.get<String>(PROPOSAL_KEY)?.let { json.decodeFromString<AiRoutineProposal>(it) })
    private val local = MutableStateFlow(AiRoutineLocal())
    private val _discarded = MutableStateFlow(false)
    val discarded: StateFlow<Boolean> = _discarded

    val assign = AiAssignController(ai, templates, routines, saved, viewModelScope, ::trainer) { _, text ->
        setProposal(null)
        local.update { it.copy(sheet = null, notice = text) }
    }

    private val student = trainerId.filterNotNull().flatMapLatest { details.observe(it, studentId) }.map { it?.detail }
    private val studentRoutines = trainerId.filterNotNull().flatMapLatest { routines.observeStudentRoutines(it, studentId) }

    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)

    private val content = combine(form, proposal, local, student, studentRoutines) { f, p, l, d, r -> Content(f, p, l, d?.gymEquipment, r) }

    val uiState: StateFlow<AiRoutineUiState> =
        combine(content, online, assign.state, assign.done) { c, online, a, done -> c.toUiState(!online, a, done, assign.progress) }
            .stateIn(viewModelScope, SharingStarted.Eagerly, AiRoutineUiState())

    init {
        proposal.value?.let(assign::restore)
        viewModelScope.launch {
            val d = student.filterNotNull().first()
            if (!form.value.prefilled) setForm(form.value.prefill(d))
        }
        viewModelScope.launch { routines.refreshList(trainer(), studentId) }
    }

    fun onGoal(goal: String) = editForm(AiField.GOAL) { it.copy(goal = goal) }
    fun onLevel(level: String) = editForm(AiField.LEVEL) { it.copy(level = level) }
    fun onDays(days: Int) = editForm(AiField.DAYS) { it.copy(daysPerWeek = days.coerceIn(1, 7)) }
    fun onDuration(min: Int) = editForm(AiField.DURATION) { it.copy(durationMin = min) }
    fun onChangeEquipment() = editForm(AiField.EQUIPMENT) { it.copy(equipment = emptyList()) }
    fun onToggleEquipment(code: String) = editForm(AiField.EQUIPMENT) { f ->
        val now = f.equipment.orEmpty()
        f.copy(equipment = if (code in now) now - code else now + code)
    }
    fun onUseProfileEquipment() = editForm(AiField.EQUIPMENT) { it.copy(equipment = null) }
    fun onInjuries(text: String) = editForm(AiField.INJURIES) { it.copy(injuries = text.take(MAX_TEXT)) }
    fun onPreferences(text: String) = editForm(AiField.PREFERENCES) { it.copy(preferences = text.take(MAX_TEXT)) }
    fun dismissNotice() = local.update { it.copy(notice = null, offerManual = false) }
    fun consumeGone() = local.update { it.copy(gone = false) }
    fun consumeDone() = assign.consumeDone()

    fun onGenerate() {
        // Se decide con el estado de origen: el derivado (uiState) puede no haber emitido todavía tras revivir el proceso.
        if (local.value.generating || proposal.value != null) return
        if (!online.value) return local.update { it.copy(notice = AI_NEEDS_NETWORK) }
        val errors = form.value.errors()
        if (errors.isNotEmpty()) return local.update { it.copy(fieldErrors = errors) }
        val params = form.value.toParams(studentId)
        local.update { it.copy(generating = true, notice = null, offerManual = false, fieldErrors = emptyMap()) }
        viewModelScope.launch {
            ai.generate(trainer(), params)
                .onSuccess { p -> setProposal(p); local.update { it.copy(generating = false) } }
                .onFailure { e -> local.update { it.afterGenerateFailed(e.toTrainerAiError()) } }
        }
    }

    /** "Generar otra": vuelve al formulario con los mismos datos. Una propuesta ya guardada no se descarta así. */
    fun onGenerateAnother() {
        if (assign.progress != null) return
        setProposal(null)
    }

    /** true si la pantalla se queda (confirma o está asignando); false = puede salir. */
    fun onBack(): Boolean {
        if (assign.state.value.running) return true
        if (proposal.value == null || assign.done.value != null) return false
        local.update { it.copy(confirmDiscard = true, sheet = null) }
        return true
    }

    fun onConfirmDiscard() {
        local.update { it.copy(confirmDiscard = false) }
        _discarded.value = true
    }

    fun onCancelDiscard() = local.update { it.copy(confirmDiscard = false) }

    fun onOpenSave() {
        if (proposal.value == null) return
        // Con progreso (aunque haya fallado) se muestra lo que ya se usó: el reintento sigue con eso, no con lo que se edite.
        val sheet = assign.progress?.let { AiSaveSheet(it.templateName, it.deactivateIds.isNotEmpty()) }
            ?: AiSaveSheet(defaultTemplateName(form.value.goal, LocalDate.now(clock)))
        local.update { it.copy(sheet = sheet) }
    }

    fun onTemplateName(name: String) = local.update { it.copy(sheet = it.sheet?.copy(name = name.take(MAX_TEMPLATE_NAME), nameError = null)) }
    fun onToggleDeactivate(on: Boolean) = local.update { it.copy(sheet = it.sheet?.copy(deactivate = on)) }
    fun onDismissSave() = local.update { if (assign.state.value.running) it else it.copy(sheet = null) }

    fun onSaveAndAssign() {
        val s = uiState.value
        val p = proposal.value ?: return
        val sheet = local.value.sheet ?: return
        if (assign.state.value.running) return
        if (assign.progress != null) return assign.retry(p)
        val name = sheet.name.trim()
        if (name.isEmpty()) return local.update { it.copy(sheet = sheet.copy(nameError = AI_NAME_REQUIRED)) }
        if (!online.value) return local.update { it.copy(notice = AI_NEEDS_NETWORK) }
        if (!s.previousKnown) {
            // Sin saber qué rutinas tiene no se asigna "a ciegas" (como en "Desde plantilla"): se vuelve a pedir.
            local.update { it.copy(notice = PREVIOUS_UNKNOWN) }
            viewModelScope.launch { routines.refreshList(trainer(), studentId) }
            return
        }
        val deactivate = if (sheet.deactivate) s.activeRoutines.map { it.id } else emptyList()
        assign.start(p, AiAssignProgress(studentId, name, deactivate, existingIds = s.allRoutineIds))
    }

    fun onRetryAssign() = proposal.value?.let(assign::retry)

    private fun editForm(field: AiField, change: (AiRoutineForm) -> AiRoutineForm) {
        if (local.value.generating || proposal.value != null) return
        setForm(change(form.value))
        local.update { it.copy(fieldErrors = it.fieldErrors - field) }
    }

    private fun setForm(f: AiRoutineForm) {
        form.value = f
        saved[FORM_KEY] = json.encodeToString(f)
    }

    private fun setProposal(p: AiRoutineProposal?) {
        proposal.value = p
        saved[PROPOSAL_KEY] = p?.let { json.encodeToString(it) }
    }
}
