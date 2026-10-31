package com.fittrainer.data.db.progress

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Caché de los gráficos de progreso (tarjeta 13). Todo por dueño, como el historial. */
@Dao
abstract class ProgressDao {

    /** Del historial guardado; el nombre es el de la sesión más reciente (columna sin agregar junto a MAX). */
    @Query(
        "SELECT e.exerciseId AS exerciseId, e.exerciseName AS name, MAX(s.startedAt) AS lastTrainedAt " +
            "FROM history_exercises e JOIN history_sessions s ON s.id = e.sessionId " +
            "WHERE s.ownerId = :ownerId AND e.exerciseId IS NOT NULL GROUP BY e.exerciseId ORDER BY lastTrainedAt DESC",
    )
    abstract fun observeTrainedExercises(ownerId: String): Flow<List<TrainedExercise>>

    /** El marcador del historial: último startedAt del ejercicio en lo guardado (null si no aparece). */
    @Query(
        "SELECT MAX(s.startedAt) FROM history_exercises e JOIN history_sessions s ON s.id = e.sessionId " +
            "WHERE s.ownerId = :ownerId AND e.exerciseId = :exerciseId",
    )
    abstract suspend fun lastTrainedAt(ownerId: String, exerciseId: String): Long?

    @Query("SELECT * FROM progress_exercise_points WHERE ownerId = :ownerId AND exerciseId = :exerciseId ORDER BY date ASC")
    abstract fun observePoints(ownerId: String, exerciseId: String): Flow<List<ProgressExercisePointEntity>>

    @Query("SELECT * FROM progress_exercise_meta WHERE ownerId = :ownerId AND exerciseId = :exerciseId")
    abstract fun observeMeta(ownerId: String, exerciseId: String): Flow<ProgressExerciseMetaEntity?>

    @Query("SELECT * FROM progress_exercise_meta WHERE ownerId = :ownerId AND exerciseId = :exerciseId")
    abstract suspend fun meta(ownerId: String, exerciseId: String): ProgressExerciseMetaEntity?

    @Upsert
    abstract suspend fun upsertMeta(meta: ProgressExerciseMetaEntity)

    @Insert
    abstract suspend fun insertPoints(points: List<ProgressExercisePointEntity>)

    @Query("DELETE FROM progress_exercise_points WHERE ownerId = :ownerId AND exerciseId = :exerciseId")
    abstract suspend fun deletePoints(ownerId: String, exerciseId: String)

    @Query("DELETE FROM progress_exercise_meta WHERE ownerId = :ownerId AND exerciseId = :exerciseId")
    abstract suspend fun deleteMeta(ownerId: String, exerciseId: String)

    @Query("SELECT * FROM progress_body_points WHERE ownerId = :ownerId ORDER BY recordedAt ASC, id ASC")
    abstract fun observeBody(ownerId: String): Flow<List<ProgressBodyPointEntity>>

    @Query("SELECT * FROM progress_body_meta WHERE ownerId = :ownerId")
    abstract suspend fun bodyMeta(ownerId: String): ProgressBodyMetaEntity?

    @Query("SELECT * FROM progress_body_meta WHERE ownerId = :ownerId")
    abstract fun observeBodyMeta(ownerId: String): Flow<ProgressBodyMetaEntity?>

    @Query("DELETE FROM progress_body_points WHERE ownerId = :ownerId")
    abstract suspend fun deleteBodyPoints(ownerId: String)

    @Insert
    abstract suspend fun insertBodyPoints(points: List<ProgressBodyPointEntity>)

    @Upsert
    abstract suspend fun upsertBodyMeta(meta: ProgressBodyMetaEntity)

    @Query("DELETE FROM progress_exercise_points WHERE ownerId = :ownerId")
    abstract suspend fun deleteAllPoints(ownerId: String)

    @Query("DELETE FROM progress_exercise_meta WHERE ownerId = :ownerId")
    abstract suspend fun deleteAllMeta(ownerId: String)

    @Query("DELETE FROM progress_body_meta WHERE ownerId = :ownerId")
    abstract suspend fun deleteBodyMeta(ownerId: String)

    @Query("DELETE FROM progress_exercise_points")
    abstract suspend fun deleteEveryPoint()

    @Query("DELETE FROM progress_exercise_meta")
    abstract suspend fun deleteEveryMeta()

    @Query("DELETE FROM progress_body_points")
    abstract suspend fun deleteEveryBodyPoint()

    @Query("DELETE FROM progress_body_meta")
    abstract suspend fun deleteEveryBodyMeta()

    /** Los puntos nuevos reemplazan a los del ejercicio y la meta se actualiza, todo junto. */
    @Transaction
    open suspend fun replaceExercise(meta: ProgressExerciseMetaEntity, points: List<ProgressExercisePointEntity>) {
        deletePoints(meta.ownerId, meta.exerciseId)
        insertPoints(points)
        upsertMeta(meta)
    }

    /** Un 404: el ejercicio ya no existe para el alumno. */
    @Transaction
    open suspend fun deleteExercise(ownerId: String, exerciseId: String) {
        deletePoints(ownerId, exerciseId)
        deleteMeta(ownerId, exerciseId)
    }

    @Transaction
    open suspend fun replaceBody(ownerId: String, points: List<ProgressBodyPointEntity>, fetchedAt: Long) {
        deleteBodyPoints(ownerId)
        insertBodyPoints(points)
        upsertBodyMeta(ProgressBodyMetaEntity(ownerId, fetchedAt))
    }

    /** Logout: se va el caché de progreso del dueño. */
    @Transaction
    open suspend fun clear(ownerId: String) {
        deleteAllPoints(ownerId)
        deleteAllMeta(ownerId)
        deleteBodyPoints(ownerId)
        deleteBodyMeta(ownerId)
    }

    @Transaction
    open suspend fun clearAll() {
        deleteEveryPoint()
        deleteEveryMeta()
        deleteEveryBodyPoint()
        deleteEveryBodyMeta()
    }

    /** Corre el bloque en una sola transacción de Room. */
    @Transaction
    open suspend fun inTransaction(block: suspend () -> Unit) = block()
}
