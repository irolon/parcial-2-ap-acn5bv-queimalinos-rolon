package com.fittrainer.testing.fakes.library

import com.fittrainer.data.db.library.LibraryDao
import com.fittrainer.data.db.library.LibraryExerciseEntity
import com.fittrainer.data.db.library.LibrarySyncEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/** DAO falso en memoria. replaceAll, clear, clearIfOwner y snapshot son los del LibraryDao real. */
class FakeLibraryDao : LibraryDao() {

    data class State(val exercises: List<LibraryExerciseEntity> = emptyList(), val sync: LibrarySyncEntity? = null)

    val state = MutableStateFlow(State())

    override fun observeExercises(): Flow<List<LibraryExerciseEntity>> =
        state.map { s -> s.exercises.sortedBy { it.position } }.distinctUntilChanged()
    override fun observeSync(): Flow<LibrarySyncEntity?> = state.map { it.sync }.distinctUntilChanged()
    override suspend fun getExercises() = state.value.exercises.sortedBy { it.position }
    override suspend fun getSync() = state.value.sync
    override suspend fun insertExercises(exercises: List<LibraryExerciseEntity>) {
        state.value = state.value.let { it.copy(exercises = it.exercises + exercises) }
    }
    override suspend fun upsertSync(sync: LibrarySyncEntity) {
        state.value = state.value.copy(sync = sync)
    }
    override suspend fun deleteExercises() {
        state.value = state.value.copy(exercises = emptyList())
    }
    override suspend fun deleteSync() {
        state.value = state.value.copy(sync = null)
    }
}
