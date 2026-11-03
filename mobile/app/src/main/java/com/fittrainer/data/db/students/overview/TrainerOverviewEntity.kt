package com.fittrainer.data.db.students.overview

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** El último resumen del Inicio de un entrenador. dataJson: la respuesta de GET /students/overview (chica). */
@Entity(tableName = "trainer_overview")
data class TrainerOverviewEntity(
    @PrimaryKey val trainerId: String,
    val dataJson: String,
    val fetchedAt: Long,
)

@Dao
abstract class TrainerOverviewDao {

    @Query("SELECT * FROM trainer_overview WHERE trainerId = :trainerId")
    abstract fun observe(trainerId: String): Flow<TrainerOverviewEntity?>

    @Upsert
    abstract suspend fun upsert(row: TrainerOverviewEntity)

    @Query("DELETE FROM trainer_overview WHERE trainerId = :trainerId")
    abstract suspend fun clearOwner(trainerId: String)

    @Query("DELETE FROM trainer_overview")
    abstract suspend fun clear()
}
