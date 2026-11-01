package com.fittrainer.testing.fakes.templates

import com.fittrainer.data.api.ExerciseDto
import com.fittrainer.data.api.routines.TrainerRoutineDetailResponse
import com.fittrainer.data.api.templates.FromRoutineRequest
import com.fittrainer.data.api.templates.InstantiateRequest
import com.fittrainer.data.api.templates.TemplateDetailDto
import com.fittrainer.data.api.templates.TemplateDetailResponse
import com.fittrainer.data.api.templates.TemplateExerciseDto
import com.fittrainer.data.api.templates.TemplateListResponse
import com.fittrainer.data.api.templates.TemplateStructureDto
import com.fittrainer.data.api.templates.TemplateSummaryDto
import com.fittrainer.data.api.templates.TrainerTemplatesApi
import com.fittrainer.data.db.templates.trainer.TrainerTemplateEntity
import com.fittrainer.data.db.templates.trainer.TrainerTemplatesDao
import com.fittrainer.data.db.templates.trainer.TrainerTemplatesSyncEntity
import com.fittrainer.testing.fakes.routines.exerciseDto
import com.fittrainer.testing.fakes.routines.routineDto
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import retrofit2.Response

fun templateDto(id: String = "tp1", name: String = "Fuerza 3 días", days: List<String> = listOf("friday", "monday")) = TemplateDetailDto(
    id, name, "strength", "intermediate", "2026-10-20T12:00:00+00:00",
    TemplateStructureDto(
        days,
        listOf(
            TemplateExerciseDto("e2", 4, 6, 120, 80.0, order = 1, exercise = ExerciseDto("e2", "Sentadilla", "legs")),
            TemplateExerciseDto("e1", 4, 8, 90, 60.0, order = 0, exercise = ExerciseDto("e1", "Press de banca", "chest")),
        ),
    ),
)

/** Servidor de plantillas en memoria. instantiate crea "rt-<n>" para el alumno. */
class FakeTrainerTemplatesApi : TrainerTemplatesApi {
    val server = mutableMapOf("tp1" to templateDto())
    var error: Throwable? = null
    var instantiateError: Throwable? = null
    var instantiateGate: CompletableDeferred<Unit>? = null
    val instantiates = mutableListOf<Pair<String, InstantiateRequest>>()
    val fromRoutines = mutableListOf<FromRoutineRequest>()

    override suspend fun list(): TemplateListResponse {
        error?.let { throw it }
        return TemplateListResponse(server.values.map { TemplateSummaryDto(it.id, it.name, it.goal, it.level, it.structure.days, it.structure.exercises.size, it.createdAt) })
    }

    override suspend fun get(id: String): TemplateDetailResponse {
        error?.let { throw it }
        return TemplateDetailResponse(server[id] ?: throw com.fittrainer.testing.fakes.auth.apiError(404, "TEMPLATE_NOT_FOUND"))
    }

    override suspend fun instantiate(id: String, body: InstantiateRequest): TrainerRoutineDetailResponse {
        instantiates += id to body
        instantiateGate?.await()
        error?.let { throw it }
        instantiateError?.let { throw it }
        val rt = "rt-${instantiates.size}"
        return TrainerRoutineDetailResponse(
            routineDto(rt, body.studentId, exercises = listOf(exerciseDto("${rt}a", 0))).copy(name = body.name, days = body.days),
        )
    }

    override suspend fun fromRoutine(body: FromRoutineRequest): Response<Unit> {
        error?.let { throw it }
        fromRoutines += body
        server["from-${body.routineId}"] = templateDto("from-${body.routineId}", body.name)
        return Response.success(201, Unit)
    }
}

class FakeTrainerTemplatesDao : TrainerTemplatesDao() {
    val rows = MutableStateFlow<Map<Pair<String, String>, TrainerTemplateEntity>>(emptyMap())
    val syncs = MutableStateFlow<Map<String, TrainerTemplatesSyncEntity>>(emptyMap())

    override fun observeAll(trainerId: String) = rows.map { m -> m.values.filter { it.trainerId == trainerId }.sortedBy { it.name.lowercase() } }
    override fun observeSync(trainerId: String) = syncs.map { it[trainerId] }
    override fun observe(trainerId: String, id: String) = rows.map { it[trainerId to id] }
    override suspend fun all(trainerId: String) = rows.value.values.filter { it.trainerId == trainerId }
    override suspend fun upsert(rows: List<TrainerTemplateEntity>) = this.rows.update { m -> m + rows.associateBy { it.trainerId to it.id } }
    override suspend fun upsertSync(sync: TrainerTemplatesSyncEntity) = syncs.update { it + (sync.trainerId to sync) }
    override suspend fun forget(trainerId: String, id: String) = rows.update { it - (trainerId to id) }
    override suspend fun clearOwnerRows(trainerId: String) = rows.update { m -> m.filterValues { it.trainerId != trainerId } }
    override suspend fun clearOwnerSync(trainerId: String) = syncs.update { it - trainerId }
    override suspend fun clearRows() = rows.update { emptyMap() }
    override suspend fun clearSync() = syncs.update { emptyMap() }
}
