package com.fittrainer.testing.fakes.routines

import com.fittrainer.data.db.routines.trainer.TrainerRoutineEntity
import com.fittrainer.data.db.routines.trainer.TrainerRoutineExerciseEntity
import com.fittrainer.data.db.routines.trainer.TrainerRoutinesDao
import com.fittrainer.data.db.routines.trainer.TrainerRoutinesSyncEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** DAO en memoria: las @Transaction de la clase real se ejecutan sobre estos métodos. */
class FakeTrainerRoutinesDao : TrainerRoutinesDao() {
    val routines = MutableStateFlow<Map<Pair<String, String>, TrainerRoutineEntity>>(emptyMap())
    val exercises = MutableStateFlow<Map<Pair<String, String>, TrainerRoutineExerciseEntity>>(emptyMap())
    val syncs = MutableStateFlow<Map<Pair<String, String>, TrainerRoutinesSyncEntity>>(emptyMap())

    override fun observeForStudent(trainerId: String, studentId: String): Flow<List<TrainerRoutineEntity>> =
        routines.map { m -> m.values.filter { it.trainerId == trainerId && it.studentId == studentId } }
    override fun observeSync(trainerId: String, studentId: String) = syncs.map { it[trainerId to studentId] }
    override fun observeRoutine(trainerId: String, id: String) = routines.map { it[trainerId to id] }
    override fun observeExercises(trainerId: String, routineId: String) = exercises.map { ordered(it, trainerId, routineId) }
    override suspend fun exercises(trainerId: String, routineId: String) = ordered(exercises.value, trainerId, routineId)

    private fun ordered(m: Map<Pair<String, String>, TrainerRoutineExerciseEntity>, trainerId: String, routineId: String) =
        m.values.filter { it.trainerId == trainerId && it.routineId == routineId }.sortedWith(compareBy({ it.orderIndex }, { it.id }))

    override suspend fun upsertRoutines(rows: List<TrainerRoutineEntity>) = routines.update { m -> m + rows.associateBy { it.trainerId to it.id } }
    override suspend fun upsertExercises(rows: List<TrainerRoutineExerciseEntity>) =
        exercises.update { m -> m + rows.associateBy { it.trainerId to it.id } }
    override suspend fun upsertSync(sync: TrainerRoutinesSyncEntity) = syncs.update { it + ((sync.trainerId to sync.studentId) to sync) }

    override suspend fun deleteStudentRoutinesExcept(trainerId: String, studentId: String, keep: List<String>) = routines.update { m ->
        m.filterValues { !(it.trainerId == trainerId && it.studentId == studentId && it.id !in keep) }
    }
    override suspend fun deleteOrphanExercises(trainerId: String) {
        val ids = routines.value.values.filter { it.trainerId == trainerId }.map { it.id }.toSet()
        exercises.update { m -> m.filterValues { it.trainerId != trainerId || it.routineId in ids } }
    }
    override suspend fun deleteExercisesOf(trainerId: String, routineId: String) =
        exercises.update { m -> m.filterValues { !(it.trainerId == trainerId && it.routineId == routineId) } }
    override suspend fun deleteExercise(trainerId: String, id: String) = exercises.update { it - (trainerId to id) }
    override suspend fun deleteRoutine(trainerId: String, id: String) = routines.update { it - (trainerId to id) }
    override suspend fun setOrder(trainerId: String, id: String, orderIndex: Int) = exercises.update { m ->
        m[trainerId to id]?.let { m + ((trainerId to id) to it.copy(orderIndex = orderIndex)) } ?: m
    }
    override suspend fun clearOwnerRoutines(trainerId: String) = routines.update { m -> m.filterValues { it.trainerId != trainerId } }
    override suspend fun clearOwnerExercises(trainerId: String) = exercises.update { m -> m.filterValues { it.trainerId != trainerId } }
    override suspend fun clearOwnerSync(trainerId: String) = syncs.update { m -> m.filterValues { it.trainerId != trainerId } }
    override suspend fun clearRoutines() = routines.update { emptyMap() }
    override suspend fun clearExercises() = exercises.update { emptyMap() }
    override suspend fun clearSync() = syncs.update { emptyMap() }
}
