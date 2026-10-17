package com.fittrainer.data.routine

import com.fittrainer.data.api.StudentRoutineDto
import com.fittrainer.data.db.routine.RoutineEntity
import com.fittrainer.data.db.routine.RoutineExerciseEntity
import com.fittrainer.data.db.routine.RoutineWithExercises
import java.time.Instant
import java.time.OffsetDateTime

fun StudentRoutineDto.toEntity() = RoutineEntity(
    id = routineId,
    name = name,
    goal = goal,
    days = days.joinToString(","),
    createdAt = parseCreatedAt(createdAt),
)

/** Un ejercicio sin datos del ejercicio (no debería pasar: hay FK) se descarta en vez de romper el sync. */
fun StudentRoutineDto.toExerciseEntities(): List<RoutineExerciseEntity> = exercises.mapNotNull { dto ->
    val exercise = dto.exercise ?: return@mapNotNull null
    RoutineExerciseEntity(
        id = dto.id,
        routineId = routineId,
        exerciseId = exercise.id,
        name = exercise.name,
        muscleGroup = exercise.muscleGroup,
        equipment = exercise.equipment,
        videoUrl = exercise.videoUrl,
        sets = dto.sets,
        reps = dto.reps,
        restSeconds = dto.restSeconds,
        suggestedKg = dto.suggestedKg,
        tempo = dto.tempo,
        notes = dto.notes,
        orderIndex = dto.orderIndex,
    )
}

fun RoutineWithExercises.toDomain() = Routine(
    id = routine.id,
    name = routine.name,
    goal = routine.goal,
    days = parseDays(routine.days.split(',')),
    createdAt = Instant.ofEpochMilli(routine.createdAt),
    exercises = exercises.sortedBy { it.orderIndex }.map { it.toDomain() },
)

private fun RoutineExerciseEntity.toDomain() = RoutineExercise(
    id = id,
    exerciseId = exerciseId,
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
    videoUrl = videoUrl,
    sets = sets,
    reps = reps,
    restSeconds = restSeconds,
    suggestedKg = suggestedKg,
    tempo = tempo,
    notes = notes,
)

/** created_at de Supabase ("2026-10-17T03:00:00.123456+00:00") a epoch millis; ilegible o ausente → 0. */
fun parseCreatedAt(raw: String?): Long =
    raw?.let { runCatching { OffsetDateTime.parse(it).toInstant().toEpochMilli() }.getOrNull() } ?: 0L
