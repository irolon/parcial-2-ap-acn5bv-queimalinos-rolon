package com.fittrainer.ui.exercises.trainer

import com.fittrainer.data.exercises.trainer.ExerciseRejectedException
import com.fittrainer.data.exercises.trainer.TrainerExercise
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.ui.components.exercise.ExerciseDetail
import com.fittrainer.ui.components.exercise.equipmentLabel
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.routines.trainer.ACTION_FAILED
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK

const val LIBRARY_TITLE = "Biblioteca"
const val NEW_EXERCISE = "Nuevo ejercicio"
const val EDIT_EXERCISE = "Editar ejercicio"
const val ONLY_MINE = "Solo míos"
const val OWN_TAG = "PROPIO"
const val EXERCISE_DELETED = "Ejercicio eliminado"
const val EXERCISE_GONE = "Ese ejercicio ya no existe"
const val NO_OWN_EXERCISES = "Todavía no creaste ejercicios propios"
const val LIBRARY_CONNECT = "Conectate para cargar la biblioteca"
const val LIBRARY_FAILED = "No pudimos actualizar la biblioteca"

/** Como en la web: uno en uso no se borra, el servidor lo archiva (sale de la biblioteca, las rutinas viejas lo siguen mostrando). */
fun deleteQuestion(name: String) =
    "¿Eliminar \"$name\"? Si está en una rutina o en el historial de un alumno, lo archivamos: sale de la " +
        "biblioteca, pero las rutinas y sesiones viejas lo siguen mostrando."

/** "Bíceps · Mancuernas", omitiendo lo que falte. */
fun exerciseSubtitle(e: TrainerExercise): String =
    listOf(muscleLabel(e.muscleGroup), equipmentLabel(e.equipment)).filter { it.isNotBlank() }.joinToString(" · ")

fun TrainerExercise.toDetail() = ExerciseDetail(
    name = name, muscleGroup = muscleGroup, equipment = equipment, videoUrl = videoUrl, description = description,
)

/** Error de una escritura → mensaje. */
fun Throwable.exerciseActionMessage(): String = when {
    this is ExerciseRejectedException -> messageText ?: ACTION_FAILED
    (this as? DataException)?.error == DataError.Offline -> NEEDS_NETWORK
    (this as? DataException)?.error == DataError.NotFound -> EXERCISE_GONE
    else -> ACTION_FAILED
}
