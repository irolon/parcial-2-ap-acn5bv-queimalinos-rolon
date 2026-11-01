package com.fittrainer.ui.exercises.trainer

import com.fittrainer.data.exercises.trainer.ExerciseInUseException
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

fun deleteQuestion(name: String) = "¿Eliminar \"$name\"? No se puede deshacer."

/** "Bíceps · Mancuernas", omitiendo lo que falte. */
fun exerciseSubtitle(e: TrainerExercise): String =
    listOf(muscleLabel(e.muscleGroup), equipmentLabel(e.equipment)).filter { it.isNotBlank() }.joinToString(" · ")

fun TrainerExercise.toDetail() = ExerciseDetail(
    name = name, muscleGroup = muscleGroup, equipment = equipment, videoUrl = videoUrl, description = description,
)

/** Error de una escritura → mensaje. Un 409 trae el texto del backend ("está en una rutina o en una sesión"). */
fun Throwable.exerciseActionMessage(): String = when {
    this is ExerciseInUseException -> messageText
    this is ExerciseRejectedException -> messageText ?: ACTION_FAILED
    (this as? DataException)?.error == DataError.Offline -> NEEDS_NETWORK
    (this as? DataException)?.error == DataError.NotFound -> EXERCISE_GONE
    else -> ACTION_FAILED
}
