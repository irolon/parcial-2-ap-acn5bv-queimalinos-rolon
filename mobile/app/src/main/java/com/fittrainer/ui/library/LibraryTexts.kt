package com.fittrainer.ui.library

import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.components.exercise.ExerciseDetail
import com.fittrainer.ui.components.exercise.muscleLabel

const val LIBRARY_TITLE = "Biblioteca"
const val ALL_GROUPS = "Todos"
const val LIBRARY_REFRESH_FAILED = "No pudimos actualizar. Mostrando la última biblioteca"
const val LIBRARY_NO_DATA_TITLE = "Todavía no hay datos"
const val LIBRARY_NO_DATA_BODY = "Conectate una vez para bajar la biblioteca."
const val LIBRARY_RETRY_TITLE = "No pudimos bajar la biblioteca"
const val LIBRARY_RETRY_BODY = "Deslizá para reintentar."
const val LIBRARY_OFFLINE = "Sin conexión — mostrando la última biblioteca"

/** "Pecho · Barra", sin separadores colgando si falta algo. */
fun librarySubtitle(exercise: LibraryExercise): String =
    listOf(muscleLabel(exercise.muscleGroup), exercise.equipment.orEmpty())
        .filter { it.isNotBlank() }
        .joinToString(" · ")

fun LibraryExercise.toDetail() = ExerciseDetail(
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
    videoUrl = videoUrl,
    description = description,
)
