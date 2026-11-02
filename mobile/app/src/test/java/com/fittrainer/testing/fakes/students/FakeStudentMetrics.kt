package com.fittrainer.testing.fakes.students

import com.fittrainer.data.api.students.OverviewResponse
import com.fittrainer.data.api.students.AttendanceResponse
import com.fittrainer.data.api.students.CreateMetricRequest
import com.fittrainer.data.api.students.MetricDto
import com.fittrainer.data.api.students.MetricResponse
import com.fittrainer.data.api.students.MetricsResponse
import com.fittrainer.data.api.students.StreakResponse
import com.fittrainer.data.api.students.StudentDetailResponse
import com.fittrainer.data.api.students.StudentListResponse
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.db.students.metrics.TrainerStudentMetricEntity
import com.fittrainer.data.db.students.metrics.TrainerStudentMetricsDao
import com.fittrainer.data.db.students.metrics.TrainerStudentMetricsSyncEntity
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.JsonObject
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.Response

fun metricDto(id: String, at: String = "2026-10-20T13:00:00Z", weight: Double? = 74.5) =
    MetricDto(id, weight, 178.0, 18.0, 80.0, null, null, at, "trainer", 23.5)

/** Servidor en memoria de medidas: guarda por id (idempotente) y responde 404 si no existe. */
class FakeMetricsApi : StudentsApi {
    val server = mutableMapOf<String, MetricDto>()
    val posts = mutableListOf<CreateMetricRequest>()
    var error: Throwable? = null
    var deleteCode: Int? = null
    var postGate: CompletableDeferred<Unit>? = null
    /** Si no es null, el GET toma la foto del servidor ANTES de esperar (una respuesta que llega tarde). */
    var listGate: CompletableDeferred<Unit>? = null
    /** Lo que el servidor recalcula al borrar (por ejemplo, el IMC de otras medidas). */
    var onDelete: (String) -> Unit = {}
    var listCalls = 0

    override suspend fun metrics(id: String): MetricsResponse {
        listCalls++
        val snapshot = server.values.sortedBy { it.recordedAt }
        listGate?.await()
        error?.let { throw it }
        return MetricsResponse(snapshot)
    }

    override suspend fun addMetric(id: String, body: CreateMetricRequest): MetricResponse {
        posts += body
        postGate?.await()
        error?.let { throw it }
        val dto = server.getOrPut(body.id) {
            MetricDto(body.id, body.weightKg, body.heightCm, body.bodyFatPct, body.waistCm, body.hipCm, body.chestCm, body.recordedAt, "trainer", 24.1)
        }
        return MetricResponse(dto)
    }

    override suspend fun deleteMetric(id: String, metricId: String): Response<Unit> {
        error?.let { throw it }
        val code = deleteCode ?: if (server.remove(metricId) != null) 204.also { onDelete(metricId) } else 404
        return if (code in 200..299) Response.success(code, Unit) else Response.error(code, "{}".toResponseBody(null))
    }

    override suspend fun list(active: Boolean, page: Int, limit: Int) = StudentListResponse()
    override suspend fun get(id: String): StudentDetailResponse = error("no se usa acá")
    override suspend fun update(id: String, body: JsonObject): StudentDetailResponse = error("no se usa acá")
    override suspend fun attendance(id: String, month: String): AttendanceResponse = error("no se usa acá")
    override suspend fun streak(id: String): StreakResponse = error("no se usa acá")
    override suspend fun overview(): OverviewResponse = error("no se usa acá")
}

class FakeTrainerStudentMetricsDao : TrainerStudentMetricsDao() {
    val rows = MutableStateFlow<Map<Pair<String, String>, TrainerStudentMetricEntity>>(emptyMap())
    val syncs = MutableStateFlow<Map<Pair<String, String>, TrainerStudentMetricsSyncEntity>>(emptyMap())

    override fun observe(trainerId: String, studentId: String): Flow<List<TrainerStudentMetricEntity>> = rows.map { m ->
        m.values.filter { it.trainerId == trainerId && it.studentId == studentId }.sortedByDescending { it.recordedAt }
    }
    override fun observeSync(trainerId: String, studentId: String) = syncs.map { it[trainerId to studentId] }
    override suspend fun upsert(rows: List<TrainerStudentMetricEntity>) {
        this.rows.value = this.rows.value + rows.associateBy { it.trainerId to it.id }
    }
    override suspend fun upsertSync(sync: TrainerStudentMetricsSyncEntity) {
        syncs.value = syncs.value + ((sync.trainerId to sync.studentId) to sync)
    }
    override suspend fun deleteStudent(trainerId: String, studentId: String) {
        rows.value = rows.value.filterValues { !(it.trainerId == trainerId && it.studentId == studentId) }
    }
    override suspend fun delete(trainerId: String, id: String) {
        rows.value = rows.value - (trainerId to id)
    }
    override suspend fun clearOwnerRows(trainerId: String) {
        rows.value = rows.value.filterValues { it.trainerId != trainerId }
    }
    override suspend fun clearOwnerSync(trainerId: String) {
        syncs.value = syncs.value.filterKeys { it.first != trainerId }
    }
    override suspend fun clearRows() {
        rows.value = emptyMap()
    }
    override suspend fun clearSync() {
        syncs.value = emptyMap()
    }
}
