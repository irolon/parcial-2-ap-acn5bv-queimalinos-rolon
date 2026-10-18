package com.fittrainer.testing.fakes.workout

import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Rest
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.data.workout.WorkoutSet
import java.time.Instant

val T0: Instant = Instant.parse("2026-10-17T10:00:00Z")

fun exercise(
    position: Int,
    sets: Int? = 2,
    reps: Int? = 8,
    restSeconds: Int? = 60,
    suggestedKg: Double? = 40.0,
    exerciseId: String = "ex-$position",
) = WorkoutExercise(
    position = position,
    routineExerciseId = "re-$position",
    exerciseId = exerciseId,
    originalExerciseId = null,
    name = "Ejercicio $position",
    muscleGroup = "chest",
    equipment = null,
    description = null,
    videoUrl = null,
    sets = sets,
    reps = reps,
    restSeconds = restSeconds,
    suggestedKg = suggestedKg,
)

fun doneSet(position: Int, setNumber: Int, kg: Double = 40.0, reps: Int = 8, at: Instant = T0) = WorkoutSet(
    id = "set-$position-$setNumber",
    position = position,
    exerciseId = "ex-$position",
    originalExerciseId = null,
    routineExerciseId = "re-$position",
    setNumber = setNumber,
    kg = kg,
    reps = reps,
    executedAt = at,
)

fun workout(
    exercises: List<WorkoutExercise> = listOf(exercise(0), exercise(1)),
    sets: List<WorkoutSet> = emptyList(),
    cursor: Cursor = Cursor(0, 1),
    rest: Rest? = null,
    ownerId: String = "u1",
) = Workout("w-1", ownerId, "rt-1", "Push", T0, exercises, sets, cursor, rest)
