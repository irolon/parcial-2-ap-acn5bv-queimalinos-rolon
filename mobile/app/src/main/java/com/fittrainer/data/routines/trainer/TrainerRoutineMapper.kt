package com.fittrainer.data.routines.trainer

import com.fittrainer.data.api.RoutineExerciseDto
import com.fittrainer.data.api.routines.NewRoutineExerciseDto
import com.fittrainer.data.api.routines.TrainerRoutineDetailDto
import com.fittrainer.data.api.routines.TrainerRoutineSummaryDto
import com.fittrainer.data.db.routines.trainer.TrainerRoutineEntity
import com.fittrainer.data.db.routines.trainer.TrainerRoutineExerciseEntity
import java.time.Instant
import java.time.OffsetDateTime

/** Supabase manda "+00:00" y microsegundos; OffsetDateTime acepta eso y "Z". */
private fun millis(iso: String?): Long? = iso?.let { runCatching { OffsetDateTime.parse(it).toInstant().toEpochMilli() }.getOrNull() }

fun TrainerRoutineSummaryDto.toEntity(trainerId: String) =
    TrainerRoutineEntity(trainerId, id, studentId, name, goal, days.joinToString(","), active, millis(createdAt))

fun TrainerRoutineDetailDto.toEntity(trainerId: String) =
    TrainerRoutineEntity(trainerId, id, studentId, name, goal, days.joinToString(","), active, millis(createdAt))

fun TrainerRoutineDetailDto.toExerciseEntities(trainerId: String) =
    exercises.sortedBy { it.orderIndex }.mapIndexed { index, dto -> dto.toEntity(trainerId, id, index) }

private fun RoutineExerciseDto.toEntity(trainerId: String, routineId: String, fallbackOrder: Int) = TrainerRoutineExerciseEntity(
    trainerId = trainerId, id = id, routineId = routineId, exerciseId = exercise?.id.orEmpty(),
    name = exercise?.name ?: "Ejercicio", muscleGroup = exercise?.muscleGroup, equipment = exercise?.equipment,
    sets = sets, reps = reps, restSeconds = restSeconds, suggestedKg = suggestedKg, tempo = tempo, notes = notes,
    orderIndex = orderIndex.takeIf { it >= 0 } ?: fallbackOrder,
)

fun TrainerRoutineEntity.toDomain() = TrainerRoutineSummary(
    id = id, studentId = studentId, name = name, goal = goal,
    days = days.split(',').filter { it.isNotBlank() }, active = active,
    createdAt = createdAt?.let(Instant::ofEpochMilli),
)

fun TrainerRoutineExerciseEntity.toDomain() = TrainerRoutineExercise(
    id, exerciseId, name, muscleGroup, equipment, sets, reps, restSeconds, suggestedKg, tempo, notes, orderIndex,
)

/** Para el POST: el orden es la posición en la lista. */
fun List<NewRoutineExercise>.toRequestItems() = mapIndexed { index, e ->
    NewRoutineExerciseDto(
        exerciseId = e.exerciseId, sets = e.values.sets, reps = e.values.reps, restSeconds = e.values.restSeconds,
        suggestedKg = e.values.suggestedKg, tempo = e.values.tempo, notes = e.values.notes, order = index,
    )
}

/** Activas primero; dentro de cada grupo, la más nueva primero. */
fun List<TrainerRoutineSummary>.sortedForSection() =
    sortedWith(compareByDescending<TrainerRoutineSummary> { it.active }.thenByDescending { it.createdAt ?: Instant.EPOCH })
