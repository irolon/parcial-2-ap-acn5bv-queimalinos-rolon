package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.invitation.invite.LEVELS
import com.fittrainer.data.students.detail.StudentDetail
import com.fittrainer.data.trainerai.AiRoutineParams
import kotlinx.serialization.Serializable

const val DEFAULT_DAYS = 3
const val DEFAULT_DURATION = 60
const val MAX_TEXT = 500
val DURATIONS = listOf(30, 45, 60, 75, 90)
/** En el orden de ROUTINE_GOALS del backend. */
val GOALS = listOf("hypertrophy", "strength", "weight_loss", "tonify")

/**
 * El formulario del asistente (E15). Serializable: vive en el SavedStateHandle.
 * equipment null = el de la ficha (no viaja); una lista = lo que marcó con "Cambiar" (vacía = solo peso corporal).
 */
@Serializable
data class AiRoutineForm(
    val goal: String? = null,
    val level: String? = null,
    val daysPerWeek: Int = DEFAULT_DAYS,
    val durationMin: Int = DEFAULT_DURATION,
    val equipment: List<String>? = null,
    val injuries: String = "",
    val preferences: String = "",
    val prefilled: Boolean = false,
)

enum class AiField { GOAL, LEVEL, DAYS, DURATION, EQUIPMENT, INJURIES, PREFERENCES }

/** Lo de la ficha; un objetivo o nivel que el backend no acepta queda sin elegir. Días: los de la rutina activa o 3. */
fun AiRoutineForm.prefill(d: StudentDetail) = copy(
    goal = d.goal?.takeIf { it in GOALS },
    level = d.level?.takeIf { it in LEVELS },
    daysPerWeek = d.activeRoutine?.days?.size?.takeIf { it in 1..7 } ?: DEFAULT_DAYS,
    injuries = d.injuries.orEmpty().take(MAX_TEXT),
    prefilled = true,
)

fun AiRoutineForm.errors(): Map<AiField, String> = buildMap {
    if (goal == null) put(AiField.GOAL, PICK_GOAL)
    if (level == null) put(AiField.LEVEL, PICK_LEVEL)
}

/** Solo con [errors] vacío. Las lesiones viajan siempre (vacías = "sin lesiones"). */
fun AiRoutineForm.toParams(studentId: String) = AiRoutineParams(
    studentId, checkNotNull(goal), checkNotNull(level), daysPerWeek, durationMin, equipment, injuries, preferences,
)

fun aiFieldOf(backendField: String): AiField? = when (backendField) {
    "goal" -> AiField.GOAL
    "level" -> AiField.LEVEL
    "frequency_per_week" -> AiField.DAYS
    "session_duration_min" -> AiField.DURATION
    "available_equipment" -> AiField.EQUIPMENT
    "injuries" -> AiField.INJURIES
    "preferences" -> AiField.PREFERENCES
    else -> null
}
