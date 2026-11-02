package com.fittrainer.testing.fakes.exercises

import com.fittrainer.data.api.exercises.TrainerExerciseDto
import com.fittrainer.data.api.exercises.TrainerExerciseListResponse
import com.fittrainer.data.api.exercises.TrainerExercisesApi
import com.fittrainer.data.db.exercises.trainer.TrainerExerciseEntity
import com.fittrainer.data.db.exercises.trainer.TrainerExercisesDao
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

fun trainerExerciseDto(id: String, name: String, group: String? = "chest", global: Boolean = true) =
    TrainerExerciseDto(id, if (global) null else "t1", name, group, "barbell", null, null, global)

class FakeTrainerExercisesApi : TrainerExercisesApi {
    var exercises = listOf(trainerExerciseDto("e1", "Press de banca"), trainerExerciseDto("e2", "Sentadilla", "legs"))
    var error: Throwable? = null
    val includeGlobalCalls = mutableListOf<Boolean>()

    override suspend fun list(includeGlobal: Boolean): TrainerExerciseListResponse {
        includeGlobalCalls += includeGlobal
        error?.let { throw it }
        return TrainerExerciseListResponse(exercises)
    }
}

class FakeTrainerExercisesDao : TrainerExercisesDao() {
    val rows = MutableStateFlow<List<TrainerExerciseEntity>>(emptyList())

    override fun observe(trainerId: String): Flow<List<TrainerExerciseEntity>> =
        rows.map { list -> list.filter { it.trainerId == trainerId }.sortedBy { it.name.lowercase() } }
    override suspend fun upsert(rows: List<TrainerExerciseEntity>) = this.rows.update { old ->
        val keys = rows.map { it.trainerId to it.id }.toSet()
        old.filter { (it.trainerId to it.id) !in keys } + rows
    }
    override suspend fun clearOwner(trainerId: String) = rows.update { list -> list.filter { it.trainerId != trainerId } }
    override suspend fun clear() = rows.update { emptyList() }
}
