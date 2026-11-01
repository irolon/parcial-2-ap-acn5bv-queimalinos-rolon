package com.fittrainer.ui.routines.trainer

import com.fittrainer.data.routines.trainer.WEEK_DAYS

const val ROUTINES_SECTION = "RUTINAS"
const val ROUTINES_EMPTY = "Sin rutinas · Asigná la primera"
const val ROUTINES_NOT_LOADED = "Todavía no se bajaron sus rutinas. Conectate para verlas."
const val ROUTINES_REFRESH_FAILED = "No pudimos actualizar las rutinas"
const val ROUTINE_ACTIVE = "ACTIVA"
const val ROUTINE_INACTIVE = "INACTIVA"
const val ASSIGN_ROUTINE = "Asignar rutina"
const val NEEDS_NETWORK = "Sin conexión · los cambios necesitan internet"
const val ACTION_FAILED = "No pudimos guardar el cambio. Probá de nuevo."
const val ROUTINE_GONE = "La rutina ya no existe"
const val NEEDS_ONE_EXERCISE = "La rutina necesita al menos un ejercicio"

private val DAY_SHORT = mapOf(
    "monday" to "LUN", "tuesday" to "MAR", "wednesday" to "MIÉ", "thursday" to "JUE",
    "friday" to "VIE", "saturday" to "SÁB", "sunday" to "DOM",
)

/** "LUN · MIÉ · VIE", en orden de la semana. */
fun routineDaysLabel(days: Collection<String>): String =
    WEEK_DAYS.filter { it in days }.joinToString(" · ") { DAY_SHORT.getValue(it) }

/** Chip de un día ("LUN"). */
fun dayChip(day: String): String = DAY_SHORT[day] ?: day

/** "4 × 10 · 90 s · 40 kg", omitiendo lo que falte. */
fun prescription(sets: Int?, reps: Int?, restSeconds: Int?, suggestedKg: Double?): String = listOfNotNull(
    if (sets != null && reps != null) "$sets × $reps" else null,
    restSeconds?.let { "$it s" },
    suggestedKg?.let { "${com.fittrainer.data.routines.trainer.kgText(it)} kg" },
).joinToString(" · ")
