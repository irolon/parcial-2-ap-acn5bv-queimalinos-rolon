package com.fittrainer.testing.fakes.students

import com.fittrainer.data.api.students.ActiveStudentsDto
import com.fittrainer.data.api.students.AttendanceResponse
import com.fittrainer.data.api.students.AttentionDto
import com.fittrainer.data.api.students.CreateMetricRequest
import com.fittrainer.data.api.students.MetricResponse
import com.fittrainer.data.api.students.MetricsResponse
import com.fittrainer.data.api.students.OverviewAdherenceDto
import com.fittrainer.data.api.students.OverviewDto
import com.fittrainer.data.api.students.OverviewResponse
import com.fittrainer.data.api.students.RecentDto
import com.fittrainer.data.api.students.SessionsTodayDto
import com.fittrainer.data.api.students.StreakResponse
import com.fittrainer.data.api.students.StudentDetailResponse
import com.fittrainer.data.api.students.StudentListResponse
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.db.students.overview.TrainerOverviewDao
import com.fittrainer.data.db.students.overview.TrainerOverviewEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.JsonObject

fun overviewDto(active: Int = 7, pct: Int? = 58, delta: Int? = 4) = OverviewDto(
    activeStudents = ActiveStudentsDto(active, 2),
    sessionsToday = SessionsTodayDto(1, 2),
    adherence = OverviewAdherenceDto(pct, delta),
    atRisk = 1,
    attention = listOf(
        AttentionDto("inactive", "s1", "Lucía Fernández", days = 10),
        AttentionDto("feedback_pending", "s2", "Ana", sessionId = "x1", routineName = "Push", finishedAt = "2026-11-01T12:00:00Z"),
        AttentionDto("feedback_pending", "s3", "Sin sesión"),
    ),
    recent = listOf(RecentDto("s2", "Ana", "x1", "Push", null, "2026-11-01T12:00:00+00:00")),
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
