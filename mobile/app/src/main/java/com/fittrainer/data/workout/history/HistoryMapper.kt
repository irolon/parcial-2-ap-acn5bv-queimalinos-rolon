package com.fittrainer.data.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.db.workout.history.HistoryExerciseEntity
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.data.db.workout.history.HistorySetEntity
import java.time.OffsetDateTime

/** Supabase manda "+00:00" y microsegundos: Instant.parse los rechaza en Android 8-13; OffsetDateTime acepta eso y "Z". */
private fun millis(iso: String): Long = OffsetDateTime.parse(iso).toInstant().toEpochMilli()

fun HistorySummaryDto.toEntity(ownerId: String, inLatest: Boolean, detailLoaded: Boolean) = HistorySessionEntity(
    id = id, ownerId = ownerId, startedAt = millis(startedAt), finishedAt = finishedAt?.let(::millis),
    durationMin = durationMin, routineName = routine?.name, rpe = rpe, notes = notes, trainerComment = trainerComment,
    hasModifications = hasModifications, sets = sets, volumeKg = volumeKg, hasPr = hasPr,
    inLatest = inLatest, detailLoaded = detailLoaded,
)

/** Lo que cambia el detalle: si algo de esto difiere del caché, hay que volver a pedirlo. */
fun HistorySessionEntity.detailMatches(dto: HistorySummaryDto): Boolean =
    detailLoaded && sets == dto.sets && volumeKg == dto.volumeKg && hasPr == dto.hasPr &&
        hasModifications == dto.hasModifications && finishedAt == dto.finishedAt?.let(::millis)

fun HistoryDetailDto.exerciseEntities(): List<HistoryExerciseEntity> = exercises.mapIndexed { i, e ->
    HistoryExerciseEntity(
        id, i, e.exercise.name, e.originalExercise?.name, e.planned?.sets, e.planned?.reps, e.planned?.suggestedKg, e.isPr,
        plannedRestSeconds = e.planned?.restSeconds,
    )
}

fun HistoryDetailDto.setEntities(): List<HistorySetEntity> = exercises.flatMapIndexed { i, e ->
    e.sets.map { s -> HistorySetEntity(s.id, id, i, s.setNumber, s.actualReps, s.actualKg, millis(s.executedAt), s.restSeconds) }
}
