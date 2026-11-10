package com.fittrainer.ui.routines.trainer.ai.assign

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.routines.trainer.deactivateOthers
import com.fittrainer.data.templates.trainer.TemplateSummary
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.AiProposalBlock
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.data.trainerai.AiSavedTemplate
import com.fittrainer.data.trainerai.TrainerAiError
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.aiTemplateName
import com.fittrainer.data.trainerai.toTrainerAiError
import com.fittrainer.ui.templates.trainer.assign.assignMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val KEY = "ai_assign_progress"
private val json = Json { ignoreUnknownKeys = true }

/**
 * "Guardar y asignar" de la E15: save-as-template (una plantilla por bloque) → instantiate de cada bloque con su
 * nombre y sus días → pausar las rutinas activas de antes → refrescar la ficha. Un solo recorrido a la vez.
 */
class AiAssignController(
    private val ai: TrainerAiRepository,
    private val templates: TrainerTemplatesRepository,
    private val routines: TrainerRoutinesRepository,
    private val saved: SavedStateHandle,
    private val scope: CoroutineScope,
    private val trainerId: suspend () -> String,
    private val onStop: (AiAssignStop, String) -> Unit,
) {
    private val _state = MutableStateFlow(AiAssignState())
    val state: StateFlow<AiAssignState> = _state
    private val _done = MutableStateFlow<AiAssignDone?>(null)
    val done: StateFlow<AiAssignDone?> = _done
    private var job: Job? = null

    val progress: AiAssignProgress? get() = saved.get<String>(KEY)?.let { json.decodeFromString<AiAssignProgress>(it) }
    private fun store(p: AiAssignProgress?) { saved[KEY] = p?.let { json.encodeToString(it) } }

    fun start(proposal: AiRoutineProposal, initial: AiAssignProgress) {
        if (job?.isActive == true || progress != null) return
        store(initial)
        run(proposal)
    }

    fun retry(proposal: AiRoutineProposal) {
        if (job?.isActive == true || !_state.value.canRetry) return
        run(proposal)
    }

    /** Después de que Android mató el proceso: muestra por dónde iba, sin seguir solo. */
    fun restore(proposal: AiRoutineProposal) {
        val p = progress ?: return
        if (p.done) { _done.value = AiAssignDone(null); return } // murió después de terminar y antes de navegar
        val k = p.assigned.count { it != null }
        _state.value = AiAssignState(assigned = k, total = proposal.blocks.size, message = assignedOf(k, proposal.blocks.size), canRetry = true)
    }

    fun consumeDone() { _done.value = null }

    private fun run(proposal: AiRoutineProposal) {
        val total = proposal.blocks.size
        _state.update { it.copy(running = true, total = total, message = null, canRetry = false) }
        job = scope.launch { execute(trainerId(), proposal, total) }
    }

    /** null = salió bien; si no, el progreso queda guardado y la falla en el estado. */
    private suspend fun saveTemplates(t: String, proposal: AiRoutineProposal, p: AiAssignProgress, total: Int): List<AiSavedTemplate>? =
        ai.save(t, proposal.generationId, p.templateName).getOrElse { e ->
            when (val error = e.toTrainerAiError()) {
                TrainerAiError.AlreadySaved -> recoverSaved(t, proposal, p, total)
                TrainerAiError.GenerationGone -> null.also { stop(AiAssignStop.GENERATION_GONE, PROPOSAL_GONE) }
                is TrainerAiError.ExercisesUnavailable -> null.also { stop(AiAssignStop.EXERCISES_UNAVAILABLE, EXERCISES_GONE) }
                TrainerAiError.Offline, TrainerAiError.Timeout -> null.also { failed(NEEDS_NETWORK_OR_RETRY, canRetry = true) }
                else -> null.also { failed(AI_SAVE_FAILED, canRetry = true) }
            }
        }

    /**
     * El guardado llegó pero la respuesta no (409 al reintentar): las plantillas están en la lista con los nombres
     * que les pone el backend. Cada bloque se reconoce por nombre y días; si alguno es ambiguo o falta, no se puede seguir.
     */
    private suspend fun recoverSaved(t: String, proposal: AiRoutineProposal, p: AiAssignProgress, total: Int): List<AiSavedTemplate>? {
        if (templates.refreshList(t).isFailure) return null.also { failed(NEEDS_NETWORK_OR_RETRY, canRetry = true) }
        val list = templates.observeList(t).first()?.templates.orEmpty()
        val found = matchSaved(proposal.blocks, p.templateName, list)
            ?: return null.also { failed(ASSIGN_NOT_RECOVERED, canRetry = false) }
        return found
    }

    private fun failed(message: String, canRetry: Boolean) =
        _state.update { it.copy(running = false, message = message, canRetry = canRetry) }

    private suspend fun execute(t: String, proposal: AiRoutineProposal, total: Int) {
        var p = progress ?: return
        if (p.templates == null) {
            val list = saveTemplates(t, proposal, p, total) ?: return
            p = p.copy(templates = list, assigned = List(total) { null }).also(::store)
        }
        for ((i, block) in proposal.blocks.withIndex()) {
            if (p.assigned[i] != null) continue
            val candidates = if (i in p.attempted) findCreated(routines, t, p, block).getOrElse { e -> return assignFailed(e, p, total) } else emptyList()
            if (candidates.size > 1) return failed(assignUnconfirmed(block.name), canRetry = false)
            val id = candidates.singleOrNull() ?: run {
                // Lo que ya está en el servidor antes de este POST nunca puede ser la rutina que crea.
                val before = currentIds(routines, t, p.studentId).getOrElse { e -> return assignFailed(e, p, total) }
                p = p.copy(attempted = p.attempted + i, existingIds = (p.existingIds + before).distinct()).also(::store)
                templates.instantiate(t, p.templates!![i].id, p.studentId, block.name, block.days).getOrElse { e -> return assignFailed(e, p, total) }
            }
            p = p.copy(assigned = p.assigned.toMutableList().also { it[i] = id }).also(::store)
            _state.update { it.copy(assigned = p.assigned.count { a -> a != null }) }
        }
        val failed = pausePrevious(routines, t, p)
        routines.refreshList(t, p.studentId)
        store(p.copy(done = true))
        _state.update { it.copy(running = false) }
        _done.value = AiAssignDone(failed.takeIf { it.isNotEmpty() }?.let(::pauseFailed))
    }

    private fun stop(reason: AiAssignStop, text: String) {
        store(null)
        _state.value = AiAssignState()
        onStop(reason, text)
    }

    private fun assignFailed(e: Throwable, p: AiAssignProgress, total: Int) {
        val k = p.assigned.count { it != null }
        _state.update { it.copy(running = false, assigned = k, message = "${e.assignMessage()} · ${assignedOf(k, total)}", canRetry = true) }
    }
}

/**
 * Rutinas del alumno que no estaban antes del último POST del bloque y tienen su nombre y sus días: si hay una, el
 * POST había llegado. Más de una no se puede atribuir (el controlador no adopta ninguna).
 */
internal suspend fun findCreated(routines: TrainerRoutinesRepository, t: String, p: AiAssignProgress, block: AiProposalBlock): Result<List<String>> =
    routines.refreshList(t, p.studentId).map {
        routines.observeStudentRoutines(t, p.studentId).first()?.routines.orEmpty().filter {
            it.id !in p.existingIds && it.id !in p.assigned && it.name == block.name && it.days.toSet() == block.days.toSet()
        }.map { it.id }
    }

/** Los ids de todas las rutinas del alumno en el servidor ahora mismo (refresca Room). */
internal suspend fun currentIds(routines: TrainerRoutinesRepository, t: String, studentId: String): Result<List<String>> =
    routines.refreshList(t, studentId).map { routines.observeStudentRoutines(t, studentId).first()?.routines.orEmpty().map { it.id } }

internal suspend fun pausePrevious(routines: TrainerRoutinesRepository, t: String, p: AiAssignProgress): List<String> {
    if (p.deactivateIds.isEmpty()) return emptyList()
    routines.refreshList(t, p.studentId) // la caché puede estar vacía si nunca se abrió la ficha de este alumno
    val previous = routines.observeStudentRoutines(t, p.studentId).first()?.routines.orEmpty().filter { it.id in p.deactivateIds }
    // Un id que no se pudo leer no se pausó: cuenta como falla en vez de callarse.
    val unknown = if (previous.size < p.deactivateIds.size) listOf(PREVIOUS_ROUTINES) else emptyList()
    return routines.deactivateOthers(t, previous, keepId = "") + unknown
}

/**
 * La plantilla de cada bloque entre las de la lista, por nombre y días. null si las claves (nombre, días) de los
 * bloques se repiten, si alguna no coincide con exactamente una plantilla o si una plantilla serviría a dos bloques.
 */
internal fun matchSaved(blocks: List<AiProposalBlock>, templateName: String, list: List<TemplateSummary>): List<AiSavedTemplate>? {
    val keys = blocks.map { aiTemplateName(templateName, it.name, blocks.size) to it.days.toSet() }
    if (keys.toSet().size != keys.size) return null
    val found = keys.map { (name, days) -> list.filter { it.name == name && it.days.toSet() == days }.singleOrNull() ?: return null }
    if (found.map { it.id }.toSet().size != found.size) return null
    return found.map { AiSavedTemplate(it.id, it.name) }
}
