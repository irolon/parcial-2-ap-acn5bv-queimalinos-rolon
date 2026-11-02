package com.fittrainer.testing.fakes.students

import com.fittrainer.data.db.students.TrainerStudentEntity
import com.fittrainer.data.db.students.TrainerStudentsDao
import com.fittrainer.data.db.students.TrainerStudentsSyncEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/** DAO falso en memoria. replaceAll, clear, clearIfOwner y snapshot son los del DAO real. */
class FakeTrainerStudentsDao : TrainerStudentsDao() {

    data class State(val students: List<TrainerStudentEntity> = emptyList(), val sync: TrainerStudentsSyncEntity? = null)

    val state = MutableStateFlow(State())

    override fun observeStudents(): Flow<List<TrainerStudentEntity>> = state.map { it.students }.distinctUntilChanged()
    override fun observeSync(): Flow<TrainerStudentsSyncEntity?> = state.map { it.sync }.distinctUntilChanged()
    override suspend fun getStudents(trainerId: String) = state.value.students.filter { it.trainerId == trainerId }
    override suspend fun getSync() = state.value.sync
    override suspend fun insertStudents(students: List<TrainerStudentEntity>) {
        state.value = state.value.let { it.copy(students = it.students + students) }
    }
    override suspend fun upsertSync(sync: TrainerStudentsSyncEntity) {
        state.value = state.value.copy(sync = sync)
    }
    override suspend fun deleteStudents() {
        state.value = state.value.copy(students = emptyList())
    }
    override suspend fun deleteSync() {
        state.value = state.value.copy(sync = null)
    }
}
