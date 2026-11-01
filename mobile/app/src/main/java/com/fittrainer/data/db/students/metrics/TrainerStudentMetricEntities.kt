package com.fittrainer.data.db.students.metrics

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Una medida corporal de un alumno, vista por su entrenador. recordedAt en epoch millis. */
@Entity(tableName = "trainer_student_metrics", primaryKeys = ["trainerId", "id"])
data class TrainerStudentMetricEntity(
    val trainerId: String,
    val id: String,
    val studentId: String,
    val recordedAt: Long,
    val weightKg: Double?,
    val heightCm: Double?,
    val bodyFatPct: Double?,
    val waistCm: Double?,
    val hipCm: Double?,
    val chestCm: Double?,
    val bmi: Double?,
    val recordedBy: String?,
)

/** Última vez que se bajó el historial de un alumno. */
@Entity(tableName = "trainer_student_metrics_sync", primaryKeys = ["trainerId", "studentId"])
data class TrainerStudentMetricsSyncEntity(val trainerId: String, val studentId: String, val fetchedAt: Long)

@Dao
abstract class TrainerStudentMetricsDao {

    @Query("SELECT * FROM trainer_student_metrics WHERE trainerId = :trainerId AND studentId = :studentId ORDER BY recordedAt DESC, id DESC")
    abstract fun observe(trainerId: String, studentId: String): Flow<List<TrainerStudentMetricEntity>>

    @Query("SELECT * FROM trainer_student_metrics_sync WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract fun observeSync(trainerId: String, studentId: String): Flow<TrainerStudentMetricsSyncEntity?>

    @Upsert
    abstract suspend fun upsert(rows: List<TrainerStudentMetricEntity>)

    @Upsert
    abstract suspend fun upsertSync(sync: TrainerStudentMetricsSyncEntity)

    @Query("DELETE FROM trainer_student_metrics WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun deleteStudent(trainerId: String, studentId: String)

    @Query("DELETE FROM trainer_student_metrics WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun delete(trainerId: String, id: String)

    @Query("DELETE FROM trainer_student_metrics WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerRows(trainerId: String)

    @Query("DELETE FROM trainer_student_metrics_sync WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerSync(trainerId: String)

    @Query("DELETE FROM trainer_student_metrics")
    abstract suspend fun clearRows()

    @Query("DELETE FROM trainer_student_metrics_sync")
    abstract suspend fun clearSync()

    /** El historial completo de un alumno, todo o nada. */
    @Transaction
    open suspend fun replaceStudent(sync: TrainerStudentMetricsSyncEntity, rows: List<TrainerStudentMetricEntity>) {
        deleteStudent(sync.trainerId, sync.studentId)
        upsert(rows)
        upsertSync(sync)
    }

    @Transaction
    open suspend fun clearOwner(trainerId: String) {
        clearOwnerRows(trainerId)
        clearOwnerSync(trainerId)
    }

    @Transaction
    open suspend fun clear() {
        clearRows()
        clearSync()
    }
}
