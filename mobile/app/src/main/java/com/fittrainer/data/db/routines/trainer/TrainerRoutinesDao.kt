package com.fittrainer.data.db.routines.trainer

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
abstract class TrainerRoutinesDao {

    @Query("SELECT * FROM trainer_routines WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract fun observeForStudent(trainerId: String, studentId: String): Flow<List<TrainerRoutineEntity>>

    @Query("SELECT * FROM trainer_routines_sync WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract fun observeSync(trainerId: String, studentId: String): Flow<TrainerRoutinesSyncEntity?>

    @Query("SELECT * FROM trainer_routines WHERE trainerId = :trainerId AND id = :id")
    abstract fun observeRoutine(trainerId: String, id: String): Flow<TrainerRoutineEntity?>

    @Query("SELECT * FROM trainer_routine_exercises WHERE trainerId = :trainerId AND routineId = :routineId ORDER BY orderIndex, id")
    abstract fun observeExercises(trainerId: String, routineId: String): Flow<List<TrainerRoutineExerciseEntity>>

    @Query("SELECT * FROM trainer_routine_exercises WHERE trainerId = :trainerId AND routineId = :routineId ORDER BY orderIndex, id")
    abstract suspend fun exercises(trainerId: String, routineId: String): List<TrainerRoutineExerciseEntity>

    @Upsert
    abstract suspend fun upsertRoutines(rows: List<TrainerRoutineEntity>)

    @Upsert
    abstract suspend fun upsertExercises(rows: List<TrainerRoutineExerciseEntity>)

    @Upsert
    abstract suspend fun upsertSync(sync: TrainerRoutinesSyncEntity)

    @Query("DELETE FROM trainer_routines WHERE trainerId = :trainerId AND studentId = :studentId AND id NOT IN (:keep)")
    abstract suspend fun deleteStudentRoutinesExcept(trainerId: String, studentId: String, keep: List<String>)

    @Query(
        "DELETE FROM trainer_routine_exercises WHERE trainerId = :trainerId AND routineId NOT IN " +
            "(SELECT id FROM trainer_routines WHERE trainerId = :trainerId)"
    )
    abstract suspend fun deleteOrphanExercises(trainerId: String)

    @Query("DELETE FROM trainer_routine_exercises WHERE trainerId = :trainerId AND routineId = :routineId")
    abstract suspend fun deleteExercisesOf(trainerId: String, routineId: String)

    @Query("DELETE FROM trainer_routine_exercises WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun deleteExercise(trainerId: String, id: String)

    @Query("DELETE FROM trainer_routines WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun deleteRoutine(trainerId: String, id: String)

    @Query("UPDATE trainer_routine_exercises SET orderIndex = :orderIndex WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun setOrder(trainerId: String, id: String, orderIndex: Int)

    @Query("DELETE FROM trainer_routines WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerRoutines(trainerId: String)

    @Query("DELETE FROM trainer_routine_exercises WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerExercises(trainerId: String)

    @Query("DELETE FROM trainer_routines_sync WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerSync(trainerId: String)

    @Query("DELETE FROM trainer_routines")
    abstract suspend fun clearRoutines()

    @Query("DELETE FROM trainer_routine_exercises")
    abstract suspend fun clearExercises()

    @Query("DELETE FROM trainer_routines_sync")
    abstract suspend fun clearSync()

    /** La lista de un alumno: borra las que ya no vinieron (y su detalle) y conserva el detalle de las demás. */
    @Transaction
    open suspend fun replaceForStudent(sync: TrainerRoutinesSyncEntity, rows: List<TrainerRoutineEntity>) {
        deleteStudentRoutinesExcept(sync.trainerId, sync.studentId, rows.map { it.id })
        deleteOrphanExercises(sync.trainerId)
        upsertRoutines(rows)
        upsertSync(sync)
    }

    /** Una rutina con todos sus ejercicios, todo o nada. */
    @Transaction
    open suspend fun replaceRoutine(row: TrainerRoutineEntity, exercises: List<TrainerRoutineExerciseEntity>) {
        upsertRoutines(listOf(row))
        deleteExercisesOf(row.trainerId, row.id)
        upsertExercises(exercises)
    }

    /** Deja order_index = posición en [ids] (el orden local mientras viaja el PUT). */
    @Transaction
    open suspend fun applyOrder(trainerId: String, ids: List<String>) {
        ids.forEachIndexed { index, id -> setOrder(trainerId, id, index) }
    }

    @Transaction
    open suspend fun forgetRoutine(trainerId: String, id: String) {
        deleteRoutine(trainerId, id)
        deleteExercisesOf(trainerId, id)
    }

    @Transaction
    open suspend fun clearOwner(trainerId: String) {
        clearOwnerRoutines(trainerId)
        clearOwnerExercises(trainerId)
        clearOwnerSync(trainerId)
    }

    @Transaction
    open suspend fun clear() {
        clearRoutines()
        clearExercises()
        clearSync()
    }
}
