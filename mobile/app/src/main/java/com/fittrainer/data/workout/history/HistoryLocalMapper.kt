package com.fittrainer.data.workout.history

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.WorkoutWithDetails
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.data.db.workout.history.HistoryWithDetails
import java.time.Instant

/** Volumen como el backend: reps × kg, a 1 decimal. */
private fun volume(pairs: List<Pair<Int, Double>>): Double = Math.round(pairs.sumOf { (r, kg) -> r * kg } * 10) / 10.0

/** Minutos redondeados como el backend (Math.round de JS: ,5 para arriba). Reloj atrasado: 0 min, nunca negativo. */
private fun minutes(startedAt: Long, finishedAt: Long?): Int? =
    finishedAt?.let { Math.round((it - startedAt).coerceAtLeast(0) / 60_000.0).toInt() }

/** Rechazada por el servidor (FAILED): no se reintenta, así que no es "Sin subir" sino "No se pudo subir". */
private fun originOf(syncState: String) = when (syncState) {
    SYNC_SYNCED -> HistoryOrigin.LOCAL_SYNCED
    SYNC_FAILED -> HistoryOrigin.LOCAL_FAILED
    else -> HistoryOrigin.LOCAL_PENDING
}

fun WorkoutWithDetails.toHistoryItem(): HistoryItem {
    val done = sets.filter { it.actualReps > 0 }
    return HistoryItem(
        id = session.id, startedAt = Instant.ofEpochMilli(session.startedAt),
        durationMin = minutes(session.startedAt, session.finishedAt), routineName = session.routineName,
        sets = done.size, volumeKg = volume(done.map { it.actualReps to it.actualKg }), rpe = session.rpe,
        hasPr = false, hasComment = false,
        origin = originOf(session.syncState),
    )
}

fun WorkoutWithDetails.toHistoryDetail(): HistoryDetail = HistoryDetail(
    item = toHistoryItem(), notes = session.notes, trainerComment = null, detailLoaded = true,
    exercises = sets.groupBy { it.position }.toSortedMap().map { (position, list) ->
        val plan = exercises.firstOrNull { it.position == position }
        HistoryExercise(
            name = plan?.name ?: "Ejercicio ${position + 1}", originalName = null,
            plannedSets = plan?.sets, plannedReps = plan?.reps, plannedKg = plan?.suggestedKg, isPr = false,
            sets = list.sortedBy { it.setNumber }.map { HistorySet(it.setNumber, it.actualReps, it.actualKg) },
        )
    },
)

fun HistorySessionEntity.toHistoryItem(rpeOverride: Int?, seenComment: String? = null) = HistoryItem(
    id, Instant.ofEpochMilli(startedAt), durationMin, routineName, sets, volumeKg, rpeOverride ?: rpe, hasPr,
    hasComment = !trainerComment.isNullOrBlank(), origin = HistoryOrigin.SERVER,
    commentUnread = !trainerComment.isNullOrBlank() && trainerComment != seenComment,
)

fun HistoryWithDetails.toHistoryDetail(rpeOverride: Int?, notesOverride: String?) = HistoryDetail(
    item = session.toHistoryItem(rpeOverride), notes = notesOverride ?: session.notes,
    trainerComment = session.trainerComment, detailLoaded = session.detailLoaded,
    missingExerciseIds = exercises.any { it.exerciseId == null },
    exercises = exercises.sortedBy { it.position }.map { e ->
        HistoryExercise(
            e.exerciseName, e.originalExerciseName, e.plannedSets, e.plannedReps, e.plannedKg, e.isPr,
            sets.filter { it.exercisePosition == e.position }.sortedBy { it.setNumber }.map { HistorySet(it.setNumber, it.reps, it.kg) },
        )
    },
)
