package com.fittrainer.ui.templates.trainer.assign

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routines.trainer.RoutineField
import com.fittrainer.data.routines.trainer.RoutineRejectedException
import com.fittrainer.data.routines.trainer.TrainerRoutineSummary
import com.fittrainer.data.routines.trainer.routineFieldOf
import com.fittrainer.data.students.TrainerStudent
import com.fittrainer.data.templates.trainer.TemplateRejectedException
import com.fittrainer.ui.routines.trainer.ACTION_FAILED
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.templates.trainer.STUDENT_GONE

/** Las rutinas activas del alumno elegido: hasta saberlas no se puede asignar (si no, no se desactivarían). */
enum class PreviousRoutines { LOADING, READY, FAILED }

/**
 * La hoja "Asignar" abierta. student: el elegido (fijo si se llegó desde la ficha). activeRoutines: las
 * activas de ese alumno, para "Desactivar la rutina actual".
 */
data class AssignState(
    val student: TrainerStudent? = null,
    val fixedStudent: Boolean = false,
    val name: String = "",
    val days: Set<String> = emptySet(),
    val errors: Map<RoutineField, String> = emptyMap(),
    val activeRoutines: List<TrainerRoutineSummary> = emptyList(),
    val previous: PreviousRoutines = PreviousRoutines.LOADING,
    val deactivateCurrent: Boolean = true,
    val pickingStudent: Boolean = false,
    val message: String? = null,
    val submitting: Boolean = false,
) {
    val showDeactivate: Boolean get() = activeRoutines.isNotEmpty()
    val canSubmit: Boolean get() = student != null && previous == PreviousRoutines.READY && !submitting
}

/** Ya asignada: el editor abre la rutina nueva y, si algo falló al desactivar las otras, el aviso. */
data class AssignDone(val routineId: String, val warning: String?)

/** Reglas de instantiate: nombre de 2 a 120 caracteres y al menos un día. Vacío = válido. */
fun AssignState.validationErrors(): Map<RoutineField, String> = buildMap {
    if (name.trim().length !in 2..120) put(RoutineField.NAME, "Entre 2 y 120 caracteres")
    if (days.isEmpty()) put(RoutineField.DAYS, "Elegí al menos un día")
}

/** Error de instantiate → mensaje de la hoja. */
fun Throwable.assignMessage(): String = when {
    this is TemplateRejectedException -> messageText
    this is RoutineRejectedException -> messageText ?: ACTION_FAILED
    (this as? DataException)?.error == DataError.Http(403) -> STUDENT_GONE
    (this as? DataException)?.error == DataError.Offline -> NEEDS_NETWORK
    else -> ACTION_FAILED
}

fun Throwable.assignFieldErrors(): Map<RoutineField, String> =
    (this as? RoutineRejectedException)?.fields.orEmpty().mapNotNull { (k, v) -> routineFieldOf(k)?.let { it to v } }.toMap()
