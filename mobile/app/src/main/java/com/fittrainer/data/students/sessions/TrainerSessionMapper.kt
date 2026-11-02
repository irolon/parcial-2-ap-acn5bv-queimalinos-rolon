package com.fittrainer.data.students.sessions

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryExerciseDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.db.students.sessions.TrainerSessionEntity
import com.fittrainer.data.workout.history.HistoryDetail
import com.fittrainer.data.workout.history.HistoryExercise
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.data.workout.history.HistorySet
import java.time.Instant
import java.time.OffsetDateTime
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

/** Supabase manda "+00:00" y microsegundos; OffsetDateTime acepta eso y "Z" (como HistoryMapper). */
private fun millis(iso: String): Long = OffsetDateTime.parse(iso).toInstant().toEpochMilli()

/** Resumen → fila. exercisesJson: el detalle que ya había (se conserva) o null. */
fun HistorySummaryDto.toTrainerEntity(
    trainerId: String,
    studentId: String,
    listed: Boolean,
    exercisesJson: String?,
) = TrainerSessionEntity(
    trainerId = trainerId, id = id, studentId = studentId, startedAt = millis(startedAt),
    finishedAt = finishedAt?.let(::millis), durationMin = durationMin, routineName = routine?.name, rpe = rpe,
    notes = notes, trainerComment = trainerComment?.takeIf { it.isNotBlank() }, hasModifications = hasModifications,
    sets = sets, volumeKg = volumeKg, hasPr = hasPr, listed = listed,
    exercisesJson = exercisesJson,
)

/** Detalle → fila con los ejercicios. Conserva si estaba en la lista. */
fun HistoryDetailDto.toTrainerEntity(trainerId: String, studentId: String, previous: TrainerSessionEntity?) =
    HistorySummaryDto(
        id, startedAt, finishedAt, durationMin, routine, rpe, notes, trainerComment, hasModifications, sets, volumeKg, hasPr,
    ).toTrainerEntity(
        trainerId, studentId,
        listed = previous?.listed ?: false,
        exercisesJson = json.encodeToString(exercises),
    )

/** El resumen nuevo con el detalle viejo, si lo que cambia el detalle no cambió (como HistoryMapper.detailMatches). */
fun TrainerSessionEntity.keepDetailFor(dto: HistorySummaryDto): String? =
    exercisesJson.takeIf {
        sets == dto.sets && volumeKg == dto.volumeKg && hasPr == dto.hasPr &&
            hasModifications == dto.hasModifications && finishedAt == dto.finishedAt?.let(::millis)
    }

fun TrainerSessionEntity.toItem() = HistoryItem(
    id = id, startedAt = Instant.ofEpochMilli(startedAt), durationMin = durationMin, routineName = routineName,
    sets = sets, volumeKg = volumeKg, rpe = rpe, hasPr = hasPr,
    hasComment = !trainerComment.isNullOrBlank(), origin = HistoryOrigin.SERVER,
)

fun HistorySummaryDto.toItem(): HistoryItem =
    toTrainerEntity("", "", listed = false, exercisesJson = null).toItem()

fun TrainerSessionEntity.toDetail(): HistoryDetail = HistoryDetail(
    item = toItem(),
    notes = notes,
    trainerComment = trainerComment,
    exercises = exercisesJson
        ?.let { runCatching { json.decodeFromString<List<HistoryExerciseDto>>(it) }.getOrNull() }
        .orEmpty().map { it.toDomain() },
    detailLoaded = exercisesJson != null,
)

/** Igual que el historial del alumno: con el nombre original si se sustituyó y el descanso del plan. */
fun HistoryExerciseDto.toDomain() = HistoryExercise(
    name = exercise.name,
    originalName = originalExercise?.name,
    plannedSets = planned?.sets,
    plannedReps = planned?.reps,
    plannedKg = planned?.suggestedKg,
    isPr = isPr,
    sets = sets.sortedBy { it.setNumber }.map { HistorySet(it.setNumber, it.actualReps, it.actualKg, it.restSeconds) },
    plannedRestSeconds = planned?.restSeconds,
)
