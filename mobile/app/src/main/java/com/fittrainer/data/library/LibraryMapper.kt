package com.fittrainer.data.library

import com.fittrainer.data.api.LibraryExerciseDto
import com.fittrainer.data.db.library.LibraryExerciseEntity

/** La posición es el índice en la respuesta: el backend ya la manda ordenada por nombre. */
fun List<LibraryExerciseDto>.toEntities(): List<LibraryExerciseEntity> = mapIndexed { index, dto ->
    LibraryExerciseEntity(
        id = dto.id,
        name = dto.name,
        muscleGroup = dto.muscleGroup?.takeIf { it.isNotBlank() },
        equipment = dto.equipment?.takeIf { it.isNotBlank() },
        description = dto.description?.takeIf { it.isNotBlank() },
        videoUrl = dto.videoUrl?.takeIf { it.isNotBlank() },
        position = index,
    )
}

fun LibraryExerciseEntity.toDomain() = LibraryExercise(
    id = id,
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
    description = description,
    videoUrl = videoUrl,
)
