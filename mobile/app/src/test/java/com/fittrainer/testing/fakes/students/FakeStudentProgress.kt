package com.fittrainer.testing.fakes.students

import com.fittrainer.data.api.students.AttendanceDayDto
import com.fittrainer.data.api.students.AttendanceDto
import com.fittrainer.data.api.students.AttendanceResponse
import com.fittrainer.data.api.students.StreakDto
import com.fittrainer.data.api.students.StreakResponse
import com.fittrainer.data.api.students.StudentDetailResponse
import com.fittrainer.data.api.students.StudentListResponse
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.db.students.progress.TrainerAttendanceDao
import com.fittrainer.data.db.students.progress.TrainerAttendanceEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.JsonObject

fun attendanceDto(month: String = "2026-11", sessions: Int = 6) = AttendanceDto(
    month, sessions, assignedDays = 9, prs = 2,
    days = listOf(AttendanceDayDto("$month-01", "trained"), AttendanceDayDto("$month-02", "missed"), AttendanceDayDto("$month-03", "rest")),
)

/** API falsa de asistencia y racha. attendanceError y streakError fallan cada pedido por separado. */
class FakeProgressApi : StudentsApi {
    val months = mutableListOf<String>()
    var attendanceError: Throwable? = null
    var streakError: Throwable? = null
    var streak = 4

    override suspend fun attendance(id: String, month: String): AttendanceResponse {
        months += month
        attendanceError?.let { throw it }
        return AttendanceResponse(attendanceDto(month))
    }

    override suspend fun streak(id: String): StreakResponse {
        streakError?.let { throw it }
        return StreakResponse(StreakDto(streak, streak))
    }

    override suspend fun list(active: Boolean, page: Int, limit: Int) = StudentListResponse()
    override suspend fun get(id: String): StudentDetailResponse = error("no se usa acá")
    override suspend fun update(id: String, body: JsonObject): StudentDetailResponse = error("no se usa acá")
}

class FakeTrainerAttendanceDao : TrainerAttendanceDao() {
    val rows = MutableStateFlow<Map<Triple<String, String, String>, TrainerAttendanceEntity>>(emptyMap())

    override fun observe(trainerId: String, studentId: String, month: String): Flow<TrainerAttendanceEntity?> =
        rows.map { it[Triple(trainerId, studentId, month)] }
    override suspend fun upsert(row: TrainerAttendanceEntity) {
        rows.value = rows.value + (Triple(row.trainerId, row.studentId, row.month) to row)
    }
    override suspend fun clearOwner(trainerId: String) {
        rows.value = rows.value.filterKeys { it.first != trainerId }
    }
    override suspend fun clear() {
        rows.value = emptyMap()
    }
}
