package com.fittrainer.data.db.workout

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Sesiones de entrenamiento. Todo se filtra por dueño: otro alumno en el mismo celular no ve nada ajeno. */
@Dao
abstract class WorkoutDao {

    @Transaction
    @Query("SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_ACTIVE' LIMIT 1")
    abstract fun observeActive(ownerId: String): Flow<WorkoutWithDetails?>

    @Transaction
    @Query("SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_ACTIVE' LIMIT 1")
    abstract suspend fun getActive(ownerId: String): WorkoutWithDetails?

    /** La última serie del ejercicio en una sesión terminada del mismo alumno ("la última vez"). */
    @Query(
        "SELECT s.* FROM workout_sets s INNER JOIN workout_sessions w ON w.id = s.sessionId " +
            "WHERE w.ownerId = :ownerId AND w.status = '$STATUS_FINISHED' AND s.exerciseId = :exerciseId " +
            "ORDER BY s.executedAt DESC LIMIT 1"
    )
    abstract suspend fun lastSetFor(ownerId: String, exerciseId: String): WorkoutSetEntity?

    /** Lo que sube la tarjeta 11: terminadas y pendientes del dueño, en orden. Nunca una ACTIVE. */
    @Query(
        "SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_FINISHED' " +
            "AND syncState = '$SYNC_PENDING' ORDER BY startedAt"
    )
    abstract suspend fun pendingUploads(ownerId: String): List<WorkoutSessionEntity>

    @Query("SELECT * FROM workout_sets WHERE sessionId = :sessionId AND syncState = '$SYNC_PENDING' ORDER BY executedAt, id")
    abstract suspend fun pendingSets(sessionId: String): List<WorkoutSetEntity>

    @Query("UPDATE workout_sets SET syncState = '$SYNC_SYNCED', syncError = NULL WHERE id IN (:ids)")
    abstract suspend fun markSetsSynced(ids: List<String>)

    @Query("UPDATE workout_sets SET syncState = '$SYNC_FAILED', syncError = :code WHERE id = :id")
    abstract suspend fun markSetFailed(id: String, code: String)

    @Query("UPDATE workout_sessions SET syncState = :syncState WHERE id = :id")
    abstract suspend fun setSyncState(id: String, syncState: String)

    /** Lo que muestra el aviso de Hoy: los rechazos ya descartados (failureSeen) no cuentan. */
    @Query(
        "SELECT COALESCE(SUM(syncState = '$SYNC_PENDING'), 0) AS pending, " +
            "COALESCE(SUM(syncState = '$SYNC_FAILED' AND failureSeen = 0), 0) AS failed, " +
            "(SELECT COUNT(*) FROM workout_sets s INNER JOIN workout_sessions w ON w.id = s.sessionId " +
            "WHERE w.ownerId = :ownerId AND s.syncState = '$SYNC_FAILED' AND s.failureSeen = 0) AS failedSets " +
            "FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_FINISHED'"
    )
    abstract fun observeUploadCounts(ownerId: String): Flow<UploadCounts>

    @Query("UPDATE workout_sessions SET failureSeen = 1 WHERE ownerId = :ownerId AND syncState = '$SYNC_FAILED'")
    abstract suspend fun markSessionFailuresSeen(ownerId: String)

    @Query(
        "UPDATE workout_sets SET failureSeen = 1 WHERE syncState = '$SYNC_FAILED' " +
            "AND sessionId IN (SELECT id FROM workout_sessions WHERE ownerId = :ownerId)"
    )
    abstract suspend fun markSetFailuresSeen(ownerId: String)

    /** El alumno descartó el aviso de rechazos: no se borra nada, solo deja de contarse en Hoy. */
    @Transaction
    open suspend fun dismissFailures(ownerId: String) {
        markSessionFailuresSeen(ownerId)
        markSetFailuresSeen(ownerId)
    }

    @Query(
        "SELECT syncState, (SELECT COUNT(*) FROM workout_sets WHERE sessionId = :id AND syncState = '$SYNC_FAILED') " +
            "AS failedSets FROM workout_sessions WHERE id = :id"
    )
    abstract fun observeSessionUpload(id: String): Flow<SessionUploadRow?>

    /**
     * Resultado de subir una sesión: series marcadas y, si no le queda ninguna pendiente, la sesión
     * subida. rejected: el servidor rechazó la sesión entera (queda FAILED, sus series sin tocar).
     */
    @Transaction
    open suspend fun applyUpload(sessionId: String, synced: List<String>, failed: Map<String, String>, rejected: Boolean) {
        if (synced.isNotEmpty()) markSetsSynced(synced)
        failed.forEach { (id, code) -> markSetFailed(id, code) }
        when {
            rejected -> setSyncState(sessionId, SYNC_FAILED)
            pendingSets(sessionId).isEmpty() -> setSyncState(sessionId, SYNC_SYNCED)
        }
    }

    @Insert
    abstract suspend fun insertSession(session: WorkoutSessionEntity)

    @Insert
    abstract suspend fun insertExercises(exercises: List<WorkoutExerciseEntity>)

    @Update
    abstract suspend fun updateSession(session: WorkoutSessionEntity)

    @Update
    abstract suspend fun updateExercise(exercise: WorkoutExerciseEntity)

    @Upsert
    abstract suspend fun upsertSet(set: WorkoutSetEntity)

    /** Borra en cascada la copia del plan y las series. */
    @Query("DELETE FROM workout_sessions WHERE id = :id")
    abstract suspend fun deleteSession(id: String)

    /** Sesión y copia del plan juntas. Falla si el alumno ya tiene una sesión abierta. */
    @Transaction
    open suspend fun start(session: WorkoutSessionEntity, exercises: List<WorkoutExerciseEntity>) {
        check(getActive(session.ownerId) == null) { "Ya hay una sesión abierta" }
        insertSession(session)
        insertExercises(exercises)
    }

    /** Serie y cursor juntos: nunca queda una serie guardada sin avanzar, ni un cursor sin su serie. */
    @Transaction
    open suspend fun saveSet(set: WorkoutSetEntity, session: WorkoutSessionEntity) {
        upsertSet(set)
        updateSession(session)
    }
}
