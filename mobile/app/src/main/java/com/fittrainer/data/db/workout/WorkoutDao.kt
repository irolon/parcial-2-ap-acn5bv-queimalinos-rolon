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
    @Query("SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = 'ACTIVE' LIMIT 1")
    abstract fun observeActive(ownerId: String): Flow<WorkoutWithDetails?>

    @Transaction
    @Query("SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = 'ACTIVE' LIMIT 1")
    abstract suspend fun getActive(ownerId: String): WorkoutWithDetails?

    /** La última serie del ejercicio en una sesión terminada del mismo alumno ("la última vez"). */
    @Query(
        "SELECT s.* FROM workout_sets s INNER JOIN workout_sessions w ON w.id = s.sessionId " +
            "WHERE w.ownerId = :ownerId AND w.status = 'FINISHED' AND s.exerciseId = :exerciseId " +
            "ORDER BY s.executedAt DESC LIMIT 1"
    )
    abstract suspend fun lastSetFor(ownerId: String, exerciseId: String): WorkoutSetEntity?

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
