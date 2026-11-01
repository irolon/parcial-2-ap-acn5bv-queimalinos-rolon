package com.fittrainer.testing.fakes.routines

import com.fittrainer.data.api.ExerciseDto
import com.fittrainer.data.api.RoutineExerciseDto
import com.fittrainer.data.api.routines.AddExercisesRequest
import com.fittrainer.data.api.routines.CreateRoutineRequest
import com.fittrainer.data.api.routines.CreatedRoutineDto
import com.fittrainer.data.api.routines.CreatedRoutineResponse
import com.fittrainer.data.api.routines.ReorderRequest
import com.fittrainer.data.api.routines.TrainerRoutineDetailDto
import com.fittrainer.data.api.routines.TrainerRoutineDetailResponse
import com.fittrainer.data.api.routines.TrainerRoutineListResponse
import com.fittrainer.data.api.routines.TrainerRoutineSummaryDto
import com.fittrainer.data.api.routines.TrainerRoutineSummaryResponse
import com.fittrainer.data.api.routines.TrainerRoutinesApi
import kotlinx.coroutines.CompletableDeferred
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.Response

fun exerciseDto(id: String, order: Int, rest: Int? = 90, name: String = "Ejercicio $id") =
    RoutineExerciseDto(id, ExerciseDto("ex-$id", name, "chest", "barbell"), 4, 10, rest, 40.0, null, null, order)

fun routineDto(id: String = "r1", studentId: String = "s1", active: Boolean = true, exercises: List<RoutineExerciseDto> = listOf(exerciseDto("re1", 0), exerciseDto("re2", 1))) =
    TrainerRoutineDetailDto(id, studentId, "Push", "hypertrophy", listOf("monday", "thursday"), active, "2026-10-01T12:00:00+00:00", exercises)

/** Servidor de rutinas en memoria. [error] hace fallar la próxima llamada; los gates simulan respuestas lentas. */
class FakeTrainerRoutinesApi : TrainerRoutinesApi {
    val server = mutableMapOf("r1" to routineDto())
    var error: Throwable? = null
    var removeCode: Int? = null
    val reorderCalls = mutableListOf<List<String>>()
    var reorderGates = ArrayDeque<CompletableDeferred<Unit>>()
    var getGate: CompletableDeferred<Unit>? = null
    var updateExerciseGate: CompletableDeferred<Unit>? = null
    var updateExerciseCalls = 0
    /** Solo para PATCH /routines/:id (activar, desactivar, cabecera). */
    var updateError: Throwable? = null
    /** Solo para el PUT del orden. */
    var reorderError: Throwable? = null
    val creates = mutableListOf<CreateRoutineRequest>()

    private fun fail() = error?.let { throw it }

    override suspend fun list(studentId: String): TrainerRoutineListResponse {
        fail()
        return TrainerRoutineListResponse(server.values.filter { it.studentId == studentId }.map { it.summary() })
    }

    override suspend fun get(id: String): TrainerRoutineDetailResponse {
        val snapshot = server[id]
        getGate?.await()
        fail()
        return TrainerRoutineDetailResponse(snapshot ?: throw com.fittrainer.testing.fakes.auth.apiError(404, "NOT_FOUND"))
    }

    override suspend fun create(body: CreateRoutineRequest): CreatedRoutineResponse {
        fail()
        creates += body
        val id = "new${creates.size}"
        server[id] = routineDto(id, body.studentId, exercises = body.exercises.map { exerciseDto("${id}e${it.order}", it.order) })
        return CreatedRoutineResponse(CreatedRoutineDto(id))
    }

    override suspend fun update(id: String, body: JsonObject): TrainerRoutineSummaryResponse {
        fail()
        updateError?.let { throw it }
        val r = server.getValue(id)
        val next = r.copy(active = body["active"]?.jsonPrimitive?.boolean ?: r.active)
        server[id] = next
        return TrainerRoutineSummaryResponse(next.summary())
    }

    override suspend fun addExercises(id: String, body: AddExercisesRequest): Response<Unit> {
        fail()
        val r = server.getValue(id)
        val added = body.exercises.mapIndexed { i, e -> exerciseDto("${id}a${r.exercises.size + i}", r.exercises.size + i, e.restSeconds) }
        server[id] = r.copy(exercises = r.exercises + added)
        return Response.success(201, Unit)
    }

    override suspend fun updateExercise(id: String, routineExerciseId: String, body: JsonObject): TrainerRoutineDetailResponse {
        updateExerciseCalls++
        updateExerciseGate?.await()
        fail()
        val r = server.getValue(id)
        val rest = body["rest_seconds"]?.jsonPrimitive?.int
        server[id] = r.copy(exercises = r.exercises.map { if (it.id == routineExerciseId) it.copy(restSeconds = rest) else it })
        return TrainerRoutineDetailResponse(server.getValue(id))
    }

    override suspend fun removeExercise(id: String, routineExerciseId: String): Response<Unit> {
        fail()
        removeCode?.let { return Response.error(it, """{"error":{"code":"ROUTINE_NEEDS_EXERCISE","message":"x"}}""".toResponseBody(null)) }
        val r = server.getValue(id)
        server[id] = r.copy(exercises = r.exercises.filter { it.id != routineExerciseId })
        return Response.success(204, Unit)
    }

    override suspend fun reorder(id: String, body: ReorderRequest): TrainerRoutineDetailResponse {
        reorderCalls += body.routineExerciseIds
        reorderGates.removeFirstOrNull()?.await()
        fail()
        reorderError?.let { throw it }
        val r = server.getValue(id)
        val byId = r.exercises.associateBy { it.id }
        server[id] = r.copy(exercises = body.routineExerciseIds.mapIndexed { i, reId -> byId.getValue(reId).copy(orderIndex = i) })
        return TrainerRoutineDetailResponse(server.getValue(id))
    }
}

private fun TrainerRoutineDetailDto.summary() = TrainerRoutineSummaryDto(id, studentId, name, goal, days, active, createdAt)
