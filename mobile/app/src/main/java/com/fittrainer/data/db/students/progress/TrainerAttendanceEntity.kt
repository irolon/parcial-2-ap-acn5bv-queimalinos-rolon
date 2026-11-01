package com.fittrainer.data.db.students.progress

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * Resumen y asistencia de un mes de un alumno, más la racha que se pidió junto. month: "YYYY-MM".
 * daysJson: los días del mes con su estado, como JSON. fetchedAt en epoch millis.
 */
@Entity(tableName = "trainer_attendance", primaryKeys = ["trainerId", "studentId", "month"])
data class TrainerAttendanceEntity(
    val trainerId: String,
    val studentId: String,
    val month: String,
    val sessions: Int,
    val assignedDays: Int,
    val prs: Int,
    val streakDays: Int,
    val daysJson: String,
    val fetchedAt: Long,
)

@Dao
abstract class TrainerAttendanceDao {

    @Query("SELECT * FROM trainer_attendance WHERE trainerId = :trainerId AND studentId = :studentId AND month = :month")
    abstract fun observe(trainerId: String, studentId: String, month: String): Flow<TrainerAttendanceEntity?>

    @Upsert
    abstract suspend fun upsert(row: TrainerAttendanceEntity)

    @Query("DELETE FROM trainer_attendance WHERE trainerId = :trainerId")
    abstract suspend fun clearOwner(trainerId: String)

    @Query("DELETE FROM trainer_attendance")
    abstract suspend fun clear()
}
