package com.fittrainer.testing.fakes.routine

import com.fittrainer.data.db.routine.RoutineDao
import com.fittrainer.data.db.routine.RoutineEntity
import com.fittrainer.data.db.routine.RoutineExerciseEntity
import com.fittrainer.data.db.routine.RoutineSyncEntity
import com.fittrainer.data.db.routine.RoutineWithExercises
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/**
 * DAO falso en memoria. replaceAll, clear, clearIfOwner y snapshot son los del RoutineDao real
 * (llaman a estas primitivas).
 *
 * Como Room, cada flujo observado se actualiza por separado: con [holdRoutinesView] un test demora
 * la emisión de las rutinas respecto de la del dueño (lo que pasa cuando Room re-consulta cada flujo).
 */
class FakeRoutineDao : RoutineDao() {

    data class State(
        val routines: List<RoutineEntity> = emptyList(),
        val exercises: List<RoutineExerciseEntity> = emptyList(),
        val sync: RoutineSyncEntity? = null,
    ) {
        fun withExercises() = routines.map { r -> RoutineWithExercises(r, exercises.filter { it.routineId == r.id }) }
    }

    val state = MutableStateFlow(State())
    private val routinesView = MutableStateFlow<List<RoutineWithExercises>>(emptyList())

    var holdRoutinesView = false
        set(value) {
            field = value
            if (!value) routinesView.value = state.value.withExercises()
        }

    private fun commit(next: State) {
        state.value = next
        if (!holdRoutinesView) routinesView.value = next.withExercises()
    }

    override fun observeRoutines(): Flow<List<RoutineWithExercises>> = routinesView
    override fun observeSync(): Flow<RoutineSyncEntity?> = state.map { it.sync }.distinctUntilChanged()
    override suspend fun getRoutines(): List<RoutineWithExercises> = state.value.withExercises()
    override suspend fun getSync(): RoutineSyncEntity? = state.value.sync
    override suspend fun insertRoutines(routines: List<RoutineEntity>) =
        commit(state.value.let { it.copy(routines = it.routines + routines) })
    override suspend fun insertExercises(exercises: List<RoutineExerciseEntity>) =
        commit(state.value.let { it.copy(exercises = it.exercises + exercises) })
    override suspend fun upsertSync(sync: RoutineSyncEntity) = commit(state.value.copy(sync = sync))
    override suspend fun deleteExercises() = commit(state.value.copy(exercises = emptyList()))
    override suspend fun deleteRoutines() = commit(state.value.copy(routines = emptyList()))
    override suspend fun deleteSync() = commit(state.value.copy(sync = null))
}
