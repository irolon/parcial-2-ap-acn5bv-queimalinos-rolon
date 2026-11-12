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

/**
 * Errores por campo. Con el equipamiento cambiado, las preferencias más la nota del extra ([extraNote]) no pueden
 * pasar de MAX_TEXT: la nota no se recorta (el backend no la recupera si el equipamiento viaja), se pide acortar.
 */
fun AiRoutineForm.errors(extraNote: String? = null): Map<AiField, String> = buildMap {
    if (goal == null) put(AiField.GOAL, PICK_GOAL)
    if (level == null) put(AiField.LEVEL, PICK_LEVEL)
    val prefs = preferencesWith(extraNote)
    if (prefs.length > MAX_TEXT) put(AiField.PREFERENCES, preferencesTooLong(MAX_TEXT - (prefs.length - preferences.trim().length)))
}

/** Lo que viaja como preferencias: con el equipamiento cambiado, sumada la nota del extra (una sola vez). */
private fun AiRoutineForm.preferencesWith(extraNote: String?): String =
    if (equipment != null && extraNote != null) withNote(preferences, extraNote) else preferences

/**
 * Solo con [errors] (con la misma [extraNote]) vacío. Las lesiones viajan (vacías = "sin lesiones") salvo que la ficha no haya cargado y el PT no
 * haya escrito nada: entonces el backend usa las de la ficha. Con el equipamiento cambiado, lo de la ficha que no está
 * en el catálogo ([extraNote], ver extraEquipmentNote) se suma a las preferencias, como hace el backend si no se cambia.
 */
fun AiRoutineForm.toParams(studentId: String, extraNote: String? = null) = AiRoutineParams(
    studentId, checkNotNull(goal), checkNotNull(level), daysPerWeek, durationMin, equipment,
    injuries.takeIf { prefilled || it.isNotBlank() },
    preferencesWith(extraNote),
)

/** Preferencias con la nota sumada al final (una sola vez). Sin recortar: el largo lo valida [errors]. */
private fun withNote(text: String, note: String): String {
    val trimmed = text.trim()
    if (trimmed == note || trimmed.endsWith(". $note")) return trimmed
    return if (trimmed.isEmpty()) note else "$trimmed. $note"
}

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
