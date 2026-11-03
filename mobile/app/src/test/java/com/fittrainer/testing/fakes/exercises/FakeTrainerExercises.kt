package com.fittrainer.testing.fakes.exercises

import com.fittrainer.data.api.exercises.TrainerExerciseDto
import com.fittrainer.data.api.exercises.TrainerExerciseListResponse
import com.fittrainer.data.api.exercises.TrainerExerciseResponse
import com.fittrainer.data.api.exercises.TrainerExercisesApi
import com.fittrainer.data.db.exercises.trainer.TrainerExerciseEntity
import com.fittrainer.data.db.exercises.trainer.TrainerExercisesDao
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.Response

fun trainerExerciseDto(id: String, name: String, group: String? = "chest", global: Boolean = true) =
    TrainerExerciseDto(id, if (global) null else "t1", name, group, "barbell", null, null, global)

/** Catálogo en memoria. [inUse]: ids que dan 409 al borrar. */
class FakeTrainerExercisesApi : TrainerExercisesApi {
    var exercises = listOf(trainerExerciseDto("e1", "Press de banca"), trainerExerciseDto("e2", "Sentadilla", "legs"))
    var error: Throwable? = null
    var writeError: Throwable? = null
    var createGate: CompletableDeferred<Unit>? = null
    /** El GET toma la foto del servidor ANTES de esperar: una respuesta que llega tarde. */
    var listGate: CompletableDeferred<Unit>? = null
    val inUse = mutableSetOf<String>()
    val includeGlobalCalls = mutableListOf<Boolean>()
    val creates = mutableListOf<JsonObject>()
    val patches = mutableListOf<Pair<String, JsonObject>>()

    override suspend fun list(includeGlobal: Boolean): TrainerExerciseListResponse {
        includeGlobalCalls += includeGlobal
        val snapshot = exercises
        listGate?.await()
        error?.let { throw it }
        return TrainerExerciseListResponse(snapshot)
    }

    override suspend fun create(body: JsonObject): TrainerExerciseResponse {
        creates += body
        createGate?.await()
        writeError?.let { throw it }
        val dto = TrainerExerciseDto(
            "own${creates.size}", "t1", body.str("name")!!, body.str("muscle_group"), body.str("equipment"),
            body.str("description"), body.str("video_url"), isGlobal = false,
        )
        exercises = exercises + dto
        return TrainerExerciseResponse(dto)
    }

    override suspend fun update(id: String, body: JsonObject): TrainerExerciseResponse {
        patches += id to body
        writeError?.let { throw it }
        val old = exercises.firstOrNull { it.id == id } ?: throw com.fittrainer.testing.fakes.auth.apiError(404, "NOT_FOUND")
        fun field(key: String, current: String?) = if (key in body) body.str(key) else current
        val dto = old.copy(
            name = field("name", old.name)!!, muscleGroup = field("muscle_group", old.muscleGroup),
            equipment = field("equipment", old.equipment), description = field("description", old.description),
            videoUrl = field("video_url", old.videoUrl),
        )
        exercises = exercises.map { if (it.id == id) dto else it }
        return TrainerExerciseResponse(dto)
    }

    override suspend fun delete(id: String): Response<Unit> {
        writeError?.let { throw it }
        if (id in inUse) {
            return Response.error(409, """{"error":{"code":"EXERCISE_IN_USE","message":"El ejercicio está en una rutina o en una sesión"}}""".toResponseBody(null))
        }
        if (exercises.none { it.id == id }) return Response.error(404, "{}".toResponseBody(null))
        exercises = exercises.filter { it.id != id }
        return Response.success(204, Unit)
    }
}

private fun JsonObject.str(key: String): String? = this[key]?.takeIf { it != JsonNull }?.jsonPrimitive?.contentOrNull

class FakeTrainerExercisesDao : TrainerExercisesDao() {
    val rows = MutableStateFlow<List<TrainerExerciseEntity>>(emptyList())

    override fun observe(trainerId: String): Flow<List<TrainerExerciseEntity>> =
        rows.map { list -> list.filter { it.trainerId == trainerId }.sortedBy { it.name.lowercase() } }
    override suspend fun upsert(rows: List<TrainerExerciseEntity>) = this.rows.update { old ->
        val keys = rows.map { it.trainerId to it.id }.toSet()
        old.filter { (it.trainerId to it.id) !in keys } + rows
    }
    override suspend fun delete(trainerId: String, id: String) = rows.update { list -> list.filter { !(it.trainerId == trainerId && it.id == id) } }
    override suspend fun clearOwner(trainerId: String) = rows.update { list -> list.filter { it.trainerId != trainerId } }
    override suspend fun clear() = rows.update { emptyList() }
}
