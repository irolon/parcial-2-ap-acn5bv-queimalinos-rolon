package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.data.workout.DEFAULT_SETS
import com.fittrainer.data.workout.MAX_SET_NUMBER
import com.fittrainer.ui.components.bodymap.partsFor
import com.fittrainer.ui.components.bodymap.paints
import com.fittrainer.ui.components.exercise.muscleLabel

/** Un grupo muscular de la rutina de hoy: qué ejercicios lo trabajan y cuántas series suma. */
data class MuscleGroupSummary(val group: String, val label: String, val exercises: List<String>, val sets: Int)

private const val ROW_MAX_GROUPS = 3

/** Solo los ejercicios que pintan algo en el cuerpo; agrupados en orden de primera aparición. */
fun todayMuscles(routine: Routine): List<MuscleGroupSummary> =
    routine.exercises
        .filter { paints(it.muscleGroup) }
        .groupBy { it.muscleGroup!! } // groupBy conserva el orden de primera aparición
        .map { (group, list) ->
            MuscleGroupSummary(group, muscleLabel(group), list.map { it.name }, list.sumOf { (it.sets ?: DEFAULT_SETS).coerceIn(1, MAX_SET_NUMBER) })
        }

/** "Pecho · Espalda · Hombros +2": los tres primeros y cuántos más. */
fun musclesRowText(groups: List<MuscleGroupSummary>): String {
    val text = groups.take(ROW_MAX_GROUPS).joinToString(" · ") { it.label }
    val extra = groups.size - ROW_MAX_GROUPS
    return if (extra > 0) "$text +$extra" else text
}

fun paintedParts(groups: List<MuscleGroupSummary>): Set<String> = groups.flatMapTo(mutableSetOf()) { partsFor(it.group) }

/** La rutina cuya hoja de músculos hay que mostrar: solo si está abierta, toca entrenar y hay algo que pintar. */
fun musclesSheetRoutine(content: TodayContent?, open: Boolean): Routine? =
    (content as? TodayContent.Training)?.routine?.takeIf { open && todayMuscles(it).isNotEmpty() }
