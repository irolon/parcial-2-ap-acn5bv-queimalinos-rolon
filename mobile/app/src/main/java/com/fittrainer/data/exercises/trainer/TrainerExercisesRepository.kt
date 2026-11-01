package com.fittrainer.data.exercises.trainer

import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.api.exercises.TrainerExerciseDto
import com.fittrainer.data.api.exercises.TrainerExercisesApi
import com.fittrainer.data.db.exercises.trainer.TrainerExerciseEntity
import com.fittrainer.data.db.exercises.trainer.TrainerExercisesDao
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.routines.trainer.orThrow
import com.fittrainer.data.session.UserDataCleaner
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonObject
import retrofit2.HttpException

/** Ejercicio del catálogo del entrenador: los globales y los propios. */
data class TrainerExercise(
    val id: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val description: String?,
    val videoUrl: String?,
    val isGlobal: Boolean,
)

/**
 * Catálogo del entrenador (GET /exercises?include_global=true), cacheado en Room y por nombre. El alta, la
 * edición y la baja de los propios (E10) son solo online y guardan la respuesta en la misma tabla: el
 * selector de rutinas (E8) los ve enseguida. Lecturas y escrituras se serializan por entrenador.
 */
@Singleton
class TrainerExercisesRepository @Inject constructor(
    private val api: TrainerExercisesApi,
    private val dao: TrainerExercisesDao,
) : UserDataCleaner {

    fun observe(trainerId: String): Flow<List<TrainerExercise>> =
        dao.observe(trainerId).map { rows -> rows.map { it.toDomain() } }.distinctUntilChanged()

    suspend fun refresh(trainerId: String): Result<Unit> = call(trainerId, null) {
        dao.replaceAll(trainerId, api.list(includeGlobal = true).data.map { it.toEntity(trainerId) })
    }

    /** Alta: devuelve el id del ejercicio nuevo. */
    suspend fun create(trainerId: String, body: JsonObject): Result<String> = call(trainerId, null) {
        val created = api.create(body).data
        dao.upsert(listOf(created.toEntity(trainerId)))
        created.id
    }

    suspend fun update(trainerId: String, id: String, patch: JsonObject): Result<Unit> = call(trainerId, id) {
        dao.upsert(listOf(api.update(id, patch).data.toEntity(trainerId)))
    }

    /** 409 → ExerciseInUseException con el mensaje del backend; el ejercicio sigue en Room. */
    suspend fun delete(trainerId: String, id: String): Result<Unit> = call(trainerId, id) {
        api.delete(id).orThrow()
        dao.delete(trainerId, id)
    }

    // Un Mutex por entrenador, que abarca la red y Room: un GET que salió antes de un alta, una edición o un
    // borrado no pisa el resultado (por ejemplo, no vuelve a meter un ejercicio recién borrado).
    private val locks = ConcurrentHashMap<String, Mutex>()

    private suspend fun <T> call(trainerId: String, id: String?, block: suspend () -> T): Result<T> = try {
        Result.success(locks.getOrPut(trainerId) { Mutex() }.withLock { block() })
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        Result.failure(
            when (e.code()) {
                403, 404 -> {
                    id?.let { dao.delete(trainerId, it) }
                    DataException(DataError.NotFound, e)
                }
                409 -> ExerciseInUseException(e.errorEnvelope()?.message ?: "Este ejercicio está en uso")
                400 -> e.errorEnvelope()?.let { env ->
                    ExerciseRejectedException(env.details.mapNotNull { d -> d.field?.let { it to d.message.orEmpty() } }.toMap(), env.message)
                } ?: DataException(DataError.Http(400), e)
                else -> DataException(e.toDataError(), e)
            },
        )
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}

fun TrainerExerciseDto.toEntity(trainerId: String) =
    TrainerExerciseEntity(trainerId, id, name, muscleGroup, equipment, description, videoUrl, isGlobal)

fun TrainerExerciseEntity.toDomain() = TrainerExercise(id, name, muscleGroup, equipment, description, videoUrl, isGlobal)
