package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import java.time.DayOfWeek
import java.time.LocalDate
import kotlin.math.roundToInt

/** Segundos de trabajo por serie para estimar la duración (el backend no lo informa). */
private const val WORK_SECONDS_PER_SET = 45
private const val DEFAULT_REST_SECONDS = 60
private const val MINUTES_STEP = 5

private val DAY_NAMES = mapOf(
    DayOfWeek.MONDAY to "lunes",
    DayOfWeek.TUESDAY to "martes",
    DayOfWeek.WEDNESDAY to "miércoles",
    DayOfWeek.THURSDAY to "jueves",
    DayOfWeek.FRIDAY to "viernes",
    DayOfWeek.SATURDAY to "sábado",
    DayOfWeek.SUNDAY to "domingo",
)

private val DAY_INITIALS = mapOf(
    DayOfWeek.MONDAY to "L",
    DayOfWeek.TUESDAY to "M",
    DayOfWeek.WEDNESDAY to "X",
    DayOfWeek.THURSDAY to "J",
    DayOfWeek.FRIDAY to "V",
    DayOfWeek.SATURDAY to "S",
    DayOfWeek.SUNDAY to "D",
)

private val MONTHS = listOf("ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC")

private val MUSCLES = mapOf(
    "chest" to "Pecho",
    "back" to "Espalda",
    "shoulders" to "Hombros",
    "legs" to "Piernas",
    "glutes" to "Glúteos",
    "biceps" to "Bíceps",
    "triceps" to "Tríceps",
    "core" to "Core",
    "calves" to "Gemelos",
    "full_body" to "Cuerpo completo",
    "cardio" to "Cardio",
)

fun dayName(day: DayOfWeek): String = DAY_NAMES.getValue(day)

fun dayInitial(day: DayOfWeek): String = DAY_INITIALS.getValue(day)

/** "SÁBADO · 17 OCT". Sin Locale: el resultado no depende del idioma del teléfono. */
fun headerDate(date: LocalDate): String =
    "${dayName(date.dayOfWeek).uppercase()} · ${date.dayOfMonth} ${MONTHS[date.monthValue - 1]}"

fun muscleLabel(raw: String?): String = raw?.let { MUSCLES[it] ?: it }.orEmpty()

/** "4×8"; sin reps, "3 series"; sin series, "12 reps"; sin nada, "". */
fun setsReps(exercise: RoutineExercise): String {
    val sets = exercise.sets
    val reps = exercise.reps
    return when {
        sets != null && reps != null -> "$sets×$reps"
        sets != null -> plural(sets, "serie", "series")
        reps != null -> "$reps reps"
        else -> ""
    }
}

/** "4×8 · Pecho", sin separadores colgando si falta algo. */
fun exerciseSubtitle(exercise: RoutineExercise): String =
    listOf(setsReps(exercise), muscleLabel(exercise.muscleGroup)).filter { it.isNotBlank() }.joinToString(" · ")

fun totalSets(exercises: List<RoutineExercise>): Int = exercises.sumOf { it.sets ?: 0 }

/** Minutos estimados, redondeados a múltiplos de 5 y nunca menos de 5 si hay ejercicios. */
fun estimatedMinutes(exercises: List<RoutineExercise>): Int {
    if (exercises.isEmpty()) return 0
    val seconds = exercises.sumOf {
        (it.sets ?: 1) * (WORK_SECONDS_PER_SET + (it.restSeconds ?: DEFAULT_REST_SECONDS))
    }
    val rounded = (seconds / 60.0 / MINUTES_STEP).roundToInt() * MINUTES_STEP
    return maxOf(MINUTES_STEP, rounded)
}

/** "6 EJERCICIOS · ~55 MIN · 18 SERIES" */
fun heroSummary(routine: Routine): String = listOf(
    plural(routine.exercises.size, "EJERCICIO", "EJERCICIOS"),
    "~${estimatedMinutes(routine.exercises)} MIN",
    plural(totalSets(routine.exercises), "SERIE", "SERIES"),
).joinToString(" · ")

fun restMessage(nextDay: DayOfWeek?): String =
    nextDay?.let { "Hoy descansás. Tu próximo entreno es el ${dayName(it)}." } ?: "Hoy descansás."

/** 40.0 → "40 kg"; 2.5 → "2,5 kg" (coma decimal). */
fun formatKg(kg: Double): String =
    if (kg % 1.0 == 0.0) "${kg.toInt()} kg" else "${kg.toString().replace('.', ',')} kg"

private fun plural(n: Int, one: String, many: String) = "$n ${if (n == 1) one else many}"
