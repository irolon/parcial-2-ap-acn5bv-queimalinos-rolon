package com.fittrainer.testing.fakes.students

import com.fittrainer.data.api.students.OverviewResponse
import com.fittrainer.data.api.students.CreateMetricRequest
import com.fittrainer.data.api.students.MetricResponse
import com.fittrainer.data.api.students.MetricsResponse
import com.fittrainer.data.api.students.ActiveRoutineDto
import com.fittrainer.data.api.students.AttendanceResponse
import com.fittrainer.data.api.students.StreakResponse
import com.fittrainer.data.api.students.LatestMetricsDto
import com.fittrainer.data.api.students.StudentDetailDto
import com.fittrainer.data.api.students.StudentDetailResponse
import com.fittrainer.data.api.students.StudentListResponse
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.db.students.TrainerStudentDetailDao
import com.fittrainer.data.db.students.TrainerStudentDetailEntity
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonPrimitive

fun detailDto(id: String = "s1", active: Boolean = true, injuries: String? = "Lumbalgia") = StudentDetailDto(
    id = id, name = "Tomás Rivera", email = "t@mail.com", goal = "strength", level = "beginner",
    birthDate = "1999-05-01", active = active, gymEquipment = listOf("Mancuernas", "Banco"), injuries = injuries,
    createdAt = "2026-10-17T12:00:00Z", lastSessionAt = "2026-10-30T15:00:00Z",
    latestMetrics = LatestMetricsDto(74.5, 178.0, null, 23.5, "2026-10-20T10:00:00Z"),
    activeRoutine = ActiveRoutineDto("r1", "Push/Pull", listOf("thursday", "monday")),
)

/** API falsa de la ficha: [detail] es lo que hay en el servidor; update aplica active e injuries. */
class FakeStudentDetailApi(var detail: StudentDetailDto = detailDto()) : StudentsApi {
    var error: Throwable? = null
    val patches = mutableListOf<JsonObject>()

    override suspend fun list(active: Boolean, page: Int, limit: Int) = StudentListResponse()

    /** Si no es null, el GET lee el estado ANTES de esperarlo (una respuesta que viaja y llega tarde). */
    var getGate: CompletableDeferred<Unit>? = null

    override suspend fun get(id: String): StudentDetailResponse {
        val snapshot = detail
        getGate?.await()
        error?.let { throw it }
        return StudentDetailResponse(snapshot)
    }

    override suspend fun update(id: String, body: JsonObject): StudentDetailResponse {
        patches += body
        error?.let { throw it }
        val active = body["active"]?.jsonPrimitive?.booleanOrNull ?: detail.active
        val injuries = if ("injuries" in body) body["injuries"]?.jsonPrimitive?.contentOrNullSafe() else detail.injuries
        detail = detail.copy(active = active, injuries = injuries)
        return StudentDetailResponse(detail)
    }

    override suspend fun attendance(id: String, month: String): AttendanceResponse = error("no se usa acá")
    override suspend fun streak(id: String): StreakResponse = error("no se usa acá")
    override suspend fun overview(): OverviewResponse = error("no se usa acá")
    override suspend fun metrics(id: String): MetricsResponse = error("no se usa acá")
    override suspend fun addMetric(id: String, body: CreateMetricRequest): MetricResponse = error("no se usa acá")
    override suspend fun deleteMetric(id: String, metricId: String): retrofit2.Response<Unit> = error("no se usa acá")

    private fun kotlinx.serialization.json.JsonPrimitive.contentOrNullSafe(): String? = if (isString) content else null
}

/** DAO falso: fichas por (trainerId, id) y las filas de la lista como (trainerId, id) → (name, goal, active). */
class FakeTrainerStudentDetailDao : TrainerStudentDetailDao() {
    val details = MutableStateFlow<Map<Pair<String, String>, TrainerStudentDetailEntity>>(emptyMap())
    val listRows = mutableMapOf<Pair<String, String>, Triple<String, String?, Boolean>>()

    override fun observe(trainerId: String, id: String): Flow<TrainerStudentDetailEntity?> = details.map { it[trainerId to id] }
    override suspend fun upsert(detail: TrainerStudentDetailEntity) {
        details.value = details.value + ((detail.trainerId to detail.id) to detail)
    }
    override suspend fun delete(trainerId: String, id: String) {
        details.value = details.value - (trainerId to id)
    }
    override suspend fun updateListRow(trainerId: String, id: String, name: String, goal: String?, active: Boolean) {
        if ((trainerId to id) in listRows) listRows[trainerId to id] = Triple(name, goal, active)
    }
    override suspend fun deleteListRow(trainerId: String, id: String) {
        listRows.remove(trainerId to id)
    }
    override suspend fun clearOwner(trainerId: String) {
        details.value = details.value.filterKeys { it.first != trainerId }
    }
    override suspend fun clear() {
        details.value = emptyMap()
    }
}
