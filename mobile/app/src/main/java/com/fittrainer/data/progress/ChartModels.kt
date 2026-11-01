package com.fittrainer.data.progress

import com.fittrainer.data.db.progress.ProgressBodyPointEntity
import com.fittrainer.data.db.progress.ProgressExerciseMetaEntity
import com.fittrainer.data.db.progress.ProgressExercisePointEntity
import com.fittrainer.data.db.progress.TrainedExercise
import java.time.LocalDate

/** Período del gráfico. Uno solo para Cargas y Medidas. */
enum class ChartRange(val days: Int?) { M1(30), M3(90), M6(180), ALL(null) }

val DEFAULT_RANGE = ChartRange.M3

enum class ChartMetric(val apiName: String) {
    E1RM("e1rm_kg"),
    MAX_KG("max_kg"),
    REPS("reps"),
}

enum class BodyField { WEIGHT, BODY_FAT, HIP, CHEST, BMI }

/**
 * Un punto del gráfico. `x` es la posición en el eje (días desde epoch, con fracción si hay hora): en Cargas es el día
 * entero; en Medidas, el momento local de la medición, para que dos del mismo día no se pisen.
 */
data class ChartPoint(val date: LocalDate, val value: Double, val x: Double = date.toEpochDay().toDouble())

/** Lo que guarda Room de un ejercicio, sin filtrar. */
data class ExerciseChart(
    val exerciseId: String,
    val points: List<ProgressExercisePointEntity>,
    val meta: ProgressExerciseMetaEntity?,
)

/** El desplegable tal como está en Room; `fetchedAt` es null si el overview nunca se bajó (no se sabe si está vacío). */
data class TrainedExercises(val items: List<TrainedExercise>, val fetchedAt: Long?)

/** Medidas del alumno tal como están en Room; `fetchedAt` es null si nunca se bajaron. */
data class BodyChart(val points: List<ProgressBodyPointEntity>, val fetchedAt: Long?)

data class Record(val value: Double, val date: LocalDate)
