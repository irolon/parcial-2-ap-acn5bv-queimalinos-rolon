package com.fittrainer.data.db.exercises.trainer

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Catálogo del entrenador (E8 lo lee para armar rutinas; E10 suma el alta, la edición y la baja). */
@Entity(tableName = "trainer_exercises", primaryKeys = ["trainerId", "id"])
data class TrainerExerciseEntity(
    val trainerId: String,
    val id: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val description: String?,
    val videoUrl: String?,
    val isGlobal: Boolean,
)

@Dao
abstract class TrainerExercisesDao {

    @Query("SELECT * FROM trainer_exercises WHERE trainerId = :trainerId ORDER BY name COLLATE NOCASE, id")
    abstract fun observe(trainerId: String): Flow<List<TrainerExerciseEntity>>

    @Upsert
    abstract suspend fun upsert(rows: List<TrainerExerciseEntity>)

    @Query("DELETE FROM trainer_exercises WHERE trainerId = :trainerId")
    abstract suspend fun clearOwner(trainerId: String)

    @Query("DELETE FROM trainer_exercises")
    abstract suspend fun clear()

    /** El catálogo completo, todo o nada. */
    @Transaction
    open suspend fun replaceAll(trainerId: String, rows: List<TrainerExerciseEntity>) {
        clearOwner(trainerId)
        upsert(rows)
    }
}
