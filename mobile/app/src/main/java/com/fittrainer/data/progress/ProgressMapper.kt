package com.fittrainer.data.progress

import com.fittrainer.data.api.progress.BodyPointDto
import com.fittrainer.data.api.progress.ExerciseProgressDto
import com.fittrainer.data.api.progress.OverviewExerciseDto
import com.fittrainer.data.db.progress.ProgressBodyPointEntity
import com.fittrainer.data.db.progress.ProgressExerciseEntity
import com.fittrainer.data.db.progress.ProgressExerciseMetaEntity
import com.fittrainer.data.db.progress.ProgressExercisePointEntity
import com.fittrainer.data.db.progress.TrainedExercise
import java.time.OffsetDateTime

fun ExerciseProgressDto.toEntities(
    ownerId: String,
    fetchedAt: Long,
): Pair<ProgressExerciseMetaEntity, List<ProgressExercisePointEntity>> {
    val id = exercise.id
    val meta = ProgressExerciseMetaEntity(
        ownerId = ownerId,
        exerciseId = id,
        defaultMetric = defaultMetric,
        prMaxKg = pr.maxKg?.value,
        prMaxKgDate = pr.maxKg?.date,
        prE1rmKg = pr.e1rmKg?.value,
        prE1rmDate = pr.e1rmKg?.date,
        fetchedAt = fetchedAt,
    )
    val rows = points.map { ProgressExercisePointEntity(ownerId, id, it.date, it.maxKg, it.e1rmKg, it.sets, it.reps) }
    return meta to rows
}

/** Supabase manda "+00:00" y microsegundos: OffsetDateTime los acepta, igual que "Z". */
fun BodyPointDto.toEntity(ownerId: String) = ProgressBodyPointEntity(
    id = id,
    ownerId = ownerId,
    recordedAt = OffsetDateTime.parse(recordedAt).toInstant().toEpochMilli(),
    weightKg = weightKg,
    heightCm = heightCm,
    bodyFatPct = bodyFatPct,
    waistCm = waistCm,
    hipCm = hipCm,
    chestCm = chestCm,
    bmi = bmi,
)

fun OverviewExerciseDto.toEntity(ownerId: String) = ProgressExerciseEntity(ownerId, id, name, days, lastDate)

/** Cambia cuando el alumno entrena el ejercicio otro día (la fecha o la cuenta de días del overview). */
fun TrainedExercise.marker(): String = "$lastDate/$days"
