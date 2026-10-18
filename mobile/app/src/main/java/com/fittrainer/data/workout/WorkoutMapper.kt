package com.fittrainer.data.workout

import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.WorkoutExerciseEntity
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.db.workout.WorkoutSetEntity
import com.fittrainer.data.db.workout.WorkoutWithDetails
import com.fittrainer.data.routine.RoutineExercise
import java.time.Instant

fun WorkoutWithDetails.toDomain(): Workout = Workout(
    id = session.id,
    ownerId = session.ownerId,
    routineId = session.routineId,
    routineName = session.routineName,
    startedAt = Instant.ofEpochMilli(session.startedAt),
    exercises = exercises.sortedBy { it.position }.map { it.toDomain() },
    sets = sets.sortedWith(compareBy({ it.position }, { it.setNumber })).map { it.toDomain() },
    cursor = Cursor(session.currentPosition, session.currentSet),
    rest = session.restTotalSeconds?.let { total ->
        Rest(session.restEndsAt?.let(Instant::ofEpochMilli), total, session.restPausedRemainingMs)
    },
)

fun WorkoutExerciseEntity.toDomain() = WorkoutExercise(
    position, routineExerciseId, exerciseId, originalExerciseId, name, muscleGroup, equipment, description,
    videoUrl, sets, reps, restSeconds, suggestedKg,
)

fun WorkoutSetEntity.toDomain() = WorkoutSet(
    id, position, exerciseId, originalExerciseId, routineExerciseId, setNumber, actualKg, actualReps,
    Instant.ofEpochMilli(executedAt),
)

/** Fila de la sesión con su cursor y su descanso. Por defecto, abierta y sin terminar. */
fun Workout.toSessionEntity(status: String = STATUS_ACTIVE, finishedAt: Long? = null) = WorkoutSessionEntity(
    id = id,
    ownerId = ownerId,
    routineId = routineId,
    routineName = routineName,
    startedAt = startedAt.toEpochMilli(),
    finishedAt = finishedAt,
    status = status,
    syncState = SYNC_PENDING,
    currentPosition = cursor.position,
    currentSet = cursor.setNumber,
    restEndsAt = rest?.endsAt?.toEpochMilli(),
    restTotalSeconds = rest?.totalSeconds,
    restPausedRemainingMs = rest?.pausedRemainingMs,
)

fun WorkoutExercise.toEntity(sessionId: String) = WorkoutExerciseEntity(
    sessionId, position, routineExerciseId, exerciseId, originalExerciseId, name, muscleGroup, equipment,
    description, videoUrl, sets, reps, restSeconds, suggestedKg,
)

fun WorkoutSet.toEntity(sessionId: String) = WorkoutSetEntity(
    id, sessionId, position, exerciseId, originalExerciseId, routineExerciseId, setNumber, kg, reps,
    executedAt.toEpochMilli(),
)

/** Copia del plan al empezar (la rutina no tiene descripción: la trae el reemplazo, si hay). */
fun RoutineExercise.toWorkoutExercise(position: Int) = WorkoutExercise(
    position = position,
    routineExerciseId = id,
    exerciseId = exerciseId,
    originalExerciseId = null,
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
    description = null,
    videoUrl = videoUrl,
    sets = sets,
    reps = reps,
    restSeconds = restSeconds,
    suggestedKg = suggestedKg,
)
