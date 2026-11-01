package com.fittrainer.data.exercises.trainer

import com.fittrainer.data.api.exercises.TrainerExerciseDto
import com.fittrainer.data.api.exercises.TrainerExercisesApi
import com.fittrainer.data.db.exercises.trainer.TrainerExerciseEntity
import com.fittrainer.data.db.exercises.trainer.TrainerExercisesDao
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

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

/** Catálogo del entrenador (GET /exercises?include_global=true), cacheado en Room y por nombre. */
@Singleton
class TrainerExercisesRepository @Inject constructor(
    private val api: TrainerExercisesApi,
    private val dao: TrainerExercisesDao,
) : UserDataCleaner {

    fun observe(trainerId: String): Flow<List<TrainerExercise>> =
        dao.observe(trainerId).map { rows -> rows.map { it.toDomain() } }.distinctUntilChanged()

    suspend fun refresh(trainerId: String): Result<Unit> = try {
        dao.replaceAll(trainerId, api.list(includeGlobal = true).data.map { it.toEntity(trainerId) })
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
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
