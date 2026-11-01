package com.fittrainer.ui.routines.trainer.create

import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.data.routines.trainer.NewRoutineExercise
import com.fittrainer.data.routines.trainer.RoutineField
import com.fittrainer.data.routines.trainer.RoutineHeaderInput
import com.fittrainer.data.routines.trainer.TrainerRoutineSummary
import com.fittrainer.ui.routines.trainer.components.ExerciseSheetState
import com.fittrainer.ui.routines.trainer.picker.PickerState

const val NEW_ROUTINE_TITLE = "Rutina nueva"
const val DEACTIVATE_CURRENT = "Desactivar la rutina actual"
const val NEW_ROUTINE_NO_EXERCISES = "Agregá al menos un ejercicio"
const val CREATE_FAILED = "No pudimos crear la rutina. Probá de nuevo."
const val PREVIOUS_UNKNOWN = "No pudimos ver sus rutinas actuales. Probá de nuevo en un momento."

/** "La rutina se creó, pero no se pudo desactivar Push y Pull". */
fun deactivateFailed(names: List<String>): String =
    "La rutina se creó, pero no se pudo desactivar ${names.joinToString(" y ")}"

/** La rutina ya se creó: el editor abre con su id y, si algo falló al desactivar las otras, el aviso. */
data class NewRoutineDone(val routineId: String, val warning: String?)

/**
 * Paso 1: nombre, objetivo, días y "Desactivar la rutina actual" (solo si tiene alguna activa).
 * Paso 2: los ejercicios, en una lista local con ↑/↓; "Crear" manda todo junto.
 */
data class NewRoutineUiState(
    val step: Int = 1,
    val header: RoutineHeaderInput = RoutineHeaderInput(),
    val headerErrors: Map<RoutineField, String> = emptyMap(),
    val activeRoutines: List<TrainerRoutineSummary> = emptyList(),
    /** Ya se sabe cuáles tiene activas (la lista se bajó alguna vez). Sin eso, "Crear" avisa y vuelve a pedirla. */
    val previousKnown: Boolean = false,
    val deactivateCurrent: Boolean = true,
    val items: List<NewRoutineExercise> = emptyList(),
    val exerciseSheet: ExerciseSheetState? = null,
    val picking: Boolean = false,
    val picker: PickerState = PickerState(),
    val creating: Boolean = false,
    val offline: Boolean = false,
    val notice: String? = null,
    val done: NewRoutineDone? = null,
) {
    val showDeactivate: Boolean get() = activeRoutines.isNotEmpty()
    val canCreate: Boolean get() = items.isNotEmpty() && !creating && !offline && done == null
}

internal data class NewRoutineLocal(
    val step: Int = 1,
    val header: RoutineHeaderInput = RoutineHeaderInput(),
    val headerErrors: Map<RoutineField, String> = emptyMap(),
    val deactivateCurrent: Boolean = true,
    val items: List<NewRoutineExercise> = emptyList(),
    val exerciseSheet: ExerciseSheetState? = null,
    val picking: Boolean = false,
    val adding: TrainerExercise? = null,
    val creating: Boolean = false,
    val notice: String? = null,
    val done: NewRoutineDone? = null,
)
