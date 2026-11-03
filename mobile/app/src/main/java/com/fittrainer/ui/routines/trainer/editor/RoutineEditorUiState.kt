package com.fittrainer.ui.routines.trainer.editor

import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routines.trainer.ExerciseField
import com.fittrainer.data.routines.trainer.RoutineField
import com.fittrainer.data.routines.trainer.RoutineHeaderInput
import com.fittrainer.data.routines.trainer.RoutineRejectedException
import com.fittrainer.data.routines.trainer.TrainerRoutineDetail
import com.fittrainer.data.routines.trainer.exerciseFieldOf
import com.fittrainer.data.routines.trainer.routineFieldOf
import com.fittrainer.ui.routines.trainer.ACTION_FAILED
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.routines.trainer.NEEDS_ONE_EXERCISE
import com.fittrainer.ui.routines.trainer.components.ExerciseSheetState
import com.fittrainer.ui.routines.trainer.picker.PickerState

data class HeaderSheetState(
    val input: RoutineHeaderInput,
    val errors: Map<RoutineField, String> = emptyMap(),
    val message: String? = null,
    val saving: Boolean = false,
)

/**
 * loaded: ya se leyó Room. detail null con loaded: la rutina no está cacheada (sin red no se puede ver).
 * Las escrituras son solo online: canEdit es false sin red, sin detalle o con una acción en curso.
 */
data class RoutineEditorUiState(
    val loaded: Boolean = false,
    val detail: TrainerRoutineDetail? = null,
    val offline: Boolean = false,
    val busy: Boolean = false,
    val exerciseSheet: ExerciseSheetState? = null,
    val headerSheet: HeaderSheetState? = null,
    val picking: Boolean = false,
    val picker: PickerState = PickerState(),
    val notice: String? = null,
    val gone: Boolean = false,
) {
    val canEdit: Boolean get() = !offline && detail != null && !busy
}

/** Lo que el ViewModel lleva aparte de Room. adding: el ejercicio elegido en el selector, todavía sin agregar. */
internal data class EditorLocal(
    val busy: Boolean = false,
    val exerciseSheet: ExerciseSheetState? = null,
    val headerSheet: HeaderSheetState? = null,
    val picking: Boolean = false,
    val adding: TrainerExercise? = null,
    val notice: String? = null,
    val gone: Boolean = false,
)

/** Sin red no se escribe: la hoja abierta muestra el aviso y no se llama al servidor. */
internal fun EditorLocal.withNetworkNotice() = copy(
    exerciseSheet = exerciseSheet?.copy(message = NEEDS_NETWORK),
    headerSheet = headerSheet?.copy(message = NEEDS_NETWORK),
)

/** Error de una escritura → mensaje para la hoja o el aviso. */
internal fun Throwable.actionMessage(): String = when ((this as? DataException)?.error) {
    DataError.Offline -> NEEDS_NETWORK
    DataError.Http(409) -> NEEDS_ONE_EXERCISE
    else -> (this as? RoutineRejectedException)?.messageText ?: ACTION_FAILED
}

internal fun Throwable.isGone(): Boolean = (this as? DataException)?.error == DataError.NotFound

/** Un 400 del backend, por campo de la hoja del ejercicio. */
internal fun Throwable.exerciseErrors(): Map<ExerciseField, String> =
    (this as? RoutineRejectedException)?.fields.orEmpty().mapNotNull { (k, v) -> exerciseFieldOf(k)?.let { it to v } }.toMap()

/** Un 400 del backend, por campo de la cabecera. */
internal fun Throwable.headerErrors(): Map<RoutineField, String> =
    (this as? RoutineRejectedException)?.fields.orEmpty().mapNotNull { (k, v) -> routineFieldOf(k)?.let { it to v } }.toMap()

/** Los ids con [id] un lugar más arriba ([up]) o más abajo; null si no se puede mover (primero ↑, último ↓). */
internal fun List<String>.moved(id: String, up: Boolean): List<String>? {
    val from = indexOf(id)
    val to = if (up) from - 1 else from + 1
    if (from < 0 || to !in indices) return null
    return toMutableList().apply { add(to, removeAt(from)) }
}
