package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.workout.Workout

/** Qué ofrece el botón de una rutina: el hero de Hoy y la barra de abajo del detalle (Mis rutinas). */
sealed interface StartAction {
    data object Start : StartAction
    data object Continue : StartAction

    /** Hay una sesión abierta de otra rutina: una sola a la vez, se termina desde la sesión. */
    data class Blocked(val otherRoutineName: String) : StartAction

    /** El repositorio no deja arrancar una rutina vacía. */
    data object NoExercises : StartAction
}

/**
 * La sesión abierta manda: si es de esta rutina se continúa (aunque la rutina haya cambiado), si es de otra
 * (o de una rutina que ya no existe, routineId nulo) se bloquea. Recién sin sesión se mira si hay ejercicios.
 */
fun startAction(routine: Routine, active: Workout?): StartAction = when {
    active != null && active.routineId == routine.id -> StartAction.Continue
    active != null -> StartAction.Blocked(active.routineName)
    routine.exercises.isEmpty() -> StartAction.NoExercises
    else -> StartAction.Start
}

/** Por qué el botón está apagado; null si se puede empezar o continuar. */
fun startActionHint(action: StartAction): String? = when (action) {
    is StartAction.Blocked -> "Tenés una sesión abierta de ${action.otherRoutineName}, terminala primero"
    StartAction.NoExercises -> "Esta rutina no tiene ejercicios"
    StartAction.Start, StartAction.Continue -> null
}
