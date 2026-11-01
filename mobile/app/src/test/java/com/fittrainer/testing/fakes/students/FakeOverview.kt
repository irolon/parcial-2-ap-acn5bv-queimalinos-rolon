package com.fittrainer.testing.fakes.students

import com.fittrainer.data.api.students.ActiveStudentsDto
import com.fittrainer.data.api.students.AttendanceResponse
import com.fittrainer.data.api.students.FeedbackDto
import com.fittrainer.data.api.students.CreateMetricRequest
import com.fittrainer.data.api.students.MetricResponse
import com.fittrainer.data.api.students.MetricsResponse
import com.fittrainer.data.api.students.OverviewAdherenceDto
import com.fittrainer.data.api.students.OverviewDto
import com.fittrainer.data.api.students.OverviewListsDto
import com.fittrainer.data.api.students.OverviewStudentDto
import com.fittrainer.data.api.students.OverviewResponse
import com.fittrainer.data.api.students.RiskDto
import com.fittrainer.data.api.students.SessionsTodayDto
import com.fittrainer.data.api.students.StreakResponse
import com.fittrainer.data.api.students.StudentDetailResponse
import com.fittrainer.data.api.students.StudentListResponse
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.api.students.TodayDto
import com.fittrainer.data.db.students.overview.TrainerOverviewDao
import com.fittrainer.data.db.students.overview.TrainerOverviewEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.JsonObject

/** José pendiente hoy, Ana terminó hoy, Beto entrenó sin tenerlo asignado; un "done" sin sesión se lee como pendiente. */
fun overviewDto(active: Int = 7, pct: Int? = 58, delta: Int? = 4, feedback: List<FeedbackDto>? = null) = OverviewDto(
    activeStudents = ActiveStudentsDto(active, 2),
    sessionsToday = SessionsTodayDto(1, 2),
    adherence = OverviewAdherenceDto(pct, delta),
    atRisk = 1,
    lists = OverviewListsDto(
        today = listOf(
            TodayDto("s4", "José Martínez", planned = true, status = "pending"),
            TodayDto("s5", "Roto", planned = true, status = "done"),
            TodayDto("s2", "Ana", planned = true, status = "done", sessionId = "x2", routineName = "Push", finishedAt = "2026-11-01T13:45:00Z", rpe = 8),
            TodayDto("s6", "Beto", planned = false, status = "done", sessionId = "x3", finishedAt = "2026-11-01T12:00:00Z"),
        ),
        atRisk = listOf(RiskDto("s1", "Lucía Fernández", 10, false)),
        feedbackPending = feedback ?: listOf(FeedbackDto("s2", "Ana", "x1", "Push", "2026-11-01T12:00:00+00:00", null)),
        students = listOf(
            OverviewStudentDto("s2", "Ana", "active", 0, 67),
            OverviewStudentDto("s1", "Lucía Fernández", "inactive", 10, null),
            OverviewStudentDto("s7", "Nora", "rara", 3, 50),
        ),
    ),
)

class FakeOverviewApi : StudentsApi {
    var response = overviewDto()
    var error: Throwable? = null
    var calls = 0

    override suspend fun overview(): OverviewResponse {
        calls++
        error?.let { throw it }
        return OverviewResponse(response)
    }

    override suspend fun list(active: Boolean, page: Int, limit: Int) = StudentListResponse()
    override suspend fun get(id: String): StudentDetailResponse = error("no se usa acá")
    override suspend fun update(id: String, body: JsonObject): StudentDetailResponse = error("no se usa acá")
    override suspend fun attendance(id: String, month: String): AttendanceResponse = error("no se usa acá")
    override suspend fun streak(id: String): StreakResponse = error("no se usa acá")
    override suspend fun metrics(id: String): MetricsResponse = error("no se usa acá")
    override suspend fun addMetric(id: String, body: CreateMetricRequest): MetricResponse = error("no se usa acá")
    override suspend fun deleteMetric(id: String, metricId: String): retrofit2.Response<Unit> = error("no se usa acá")
}

class FakeTrainerOverviewDao : TrainerOverviewDao() {
    val rows = MutableStateFlow<Map<String, TrainerOverviewEntity>>(emptyMap())

    override fun observe(trainerId: String): Flow<TrainerOverviewEntity?> = rows.map { it[trainerId] }
    override suspend fun upsert(row: TrainerOverviewEntity) {
        rows.value = rows.value + (row.trainerId to row)
    }
    override suspend fun clearOwner(trainerId: String) {
        rows.value = rows.value - trainerId
    }
    override suspend fun clear() {
        rows.value = emptyMap()
    }
}
