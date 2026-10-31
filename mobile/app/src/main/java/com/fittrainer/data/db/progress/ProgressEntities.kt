package com.fittrainer.data.db.progress

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** Un punto del gráfico de cargas: lo mejor de un ejercicio en un día (tarjeta 13). Es caché, por dueño. */
@Entity(tableName = "progress_exercise_points", primaryKeys = ["ownerId", "exerciseId", "date"])
data class ProgressExercisePointEntity(
    val ownerId: String,
    val exerciseId: String,
    /** YYYY-MM-DD local, tal como llega del servidor. */
    val date: String,
    val maxKg: Double?,
    val e1rmKg: Double?,
    val sets: Int,
    val reps: Int,
)

/**
 * Métrica por defecto, récords y momento de la última bajada de un ejercicio. [historyMarker] es el último
 * `startedAt` del ejercicio en el historial guardado al momento del pedido: si el historial trae una sesión más
 * nueva, lo guardado deja de estar fresco aunque no hayan pasado 5 minutos.
 */
@Entity(tableName = "progress_exercise_meta", primaryKeys = ["ownerId", "exerciseId"])
data class ProgressExerciseMetaEntity(
    val ownerId: String,
    val exerciseId: String,
    val defaultMetric: String,
    val prMaxKg: Double?,
    val prMaxKgDate: String?,
    val prE1rmKg: Double?,
    val prE1rmDate: String?,
    val fetchedAt: Long,
    val historyMarker: Long? = null,
)

@Entity(tableName = "progress_body_points", indices = [Index(value = ["ownerId", "recordedAt"])])
data class ProgressBodyPointEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val recordedAt: Long,
    val weightKg: Double?,
    val heightCm: Double?,
    val bodyFatPct: Double?,
    val waistCm: Double?,
    val hipCm: Double?,
    val chestCm: Double?,
    val bmi: Double?,
)

/** Cuándo se bajaron las medidas del dueño por última vez. */
@Entity(tableName = "progress_body_meta")
data class ProgressBodyMetaEntity(
    @PrimaryKey val ownerId: String,
    val fetchedAt: Long,
)

/** Ejercicio que el alumno ya entrenó, para el desplegable. Es resultado de consulta, no tabla. */
data class TrainedExercise(
    val exerciseId: String,
    val name: String,
    val lastTrainedAt: Long,
)
