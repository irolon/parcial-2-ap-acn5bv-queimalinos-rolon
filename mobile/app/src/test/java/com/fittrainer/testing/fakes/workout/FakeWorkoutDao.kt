package com.fittrainer.testing.fakes.workout

import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.db.workout.WorkoutExerciseEntity
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.db.workout.WorkoutSetEntity
import com.fittrainer.data.db.workout.WorkoutWithDetails
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** DAO en memoria. */
class FakeWorkoutDao : WorkoutDao() {

    data class State(
        val sessions: Map<String, WorkoutSessionEntity> = emptyMap(),
        val exercises: List<WorkoutExerciseEntity> = emptyList(),
        val sets: List<WorkoutSetEntity> = emptyList(),
    )

    val state = MutableStateFlow(State())

    /** Simula que Room falla al escribir (spec §6). */
    var failWrites = false

    /** Simula que Room falla al leer el historial (lastSetFor). */
    var failReads = false

    private fun activeOf(st: State, ownerId: String): WorkoutWithDetails? =
        st.sessions.values.firstOrNull { it.ownerId == ownerId && it.status == STATUS_ACTIVE }?.let { s ->
            WorkoutWithDetails(s, st.exercises.filter { it.sessionId == s.id }, st.sets.filter { it.sessionId == s.id })
        }

    private val held = MutableStateFlow(false)

    /** Con true Room "todavía no contestó": observeActive no emite nada hasta soltarlo. */
    var holdObserve: Boolean
        get() = held.value
        set(value) { held.value = value }

    @OptIn(ExperimentalCoroutinesApi::class)
    override fun observeActive(ownerId: String): Flow<WorkoutWithDetails?> = held.flatMapLatest { hold ->
        if (hold) emptyFlow() else state.map { activeOf(it, ownerId) }.distinctUntilChanged()
    }

    override suspend fun getActive(ownerId: String) = activeOf(state.value, ownerId)

    override suspend fun lastSetFor(ownerId: String, exerciseId: String): WorkoutSetEntity? {
        check(!failReads) { "Room falló al leer" }
        val st = state.value
        return st.sets.filter { set ->
            val session = st.sessions[set.sessionId]
            set.exerciseId == exerciseId && session?.ownerId == ownerId && session.status == STATUS_FINISHED
        }.maxByOrNull { it.executedAt }
    }

    override suspend fun insertSession(session: WorkoutSessionEntity) =
        write { it.copy(sessions = it.sessions + (session.id to session)) }

    override suspend fun insertExercises(exercises: List<WorkoutExerciseEntity>) =
        write { it.copy(exercises = it.exercises + exercises) }

    override suspend fun updateSession(session: WorkoutSessionEntity) =
        write { it.copy(sessions = it.sessions + (session.id to session)) }

    override suspend fun updateExercise(exercise: WorkoutExerciseEntity) = write { st ->
        st.copy(exercises = st.exercises.map {
            if (it.sessionId == exercise.sessionId && it.position == exercise.position) exercise else it
        })
    }

    override suspend fun upsertSet(set: WorkoutSetEntity) =
        write { st -> st.copy(sets = st.sets.filterNot { it.id == set.id } + set) }

    override suspend fun deleteSession(id: String) = write { st ->
        st.copy(
            sessions = st.sessions - id,
            exercises = st.exercises.filterNot { it.sessionId == id },
            sets = st.sets.filterNot { it.sessionId == id },
        )
    }

    override suspend fun pendingUploads(ownerId: String) = state.value.sessions.values
        .filter { it.ownerId == ownerId && it.status == STATUS_FINISHED && it.syncState == SYNC_PENDING }
        .sortedBy { it.startedAt }

    override suspend fun pendingSets(sessionId: String) = state.value.sets
        .filter { it.sessionId == sessionId && it.syncState == SYNC_PENDING }
        .sortedWith(compareBy({ it.executedAt }, { it.id }))

    override suspend fun markSetsSynced(ids: List<String>) = write { st ->
        st.copy(sets = st.sets.map { if (it.id in ids) it.copy(syncState = SYNC_SYNCED, syncError = null) else it })
    }

    override suspend fun markSetFailed(id: String, code: String) = write { st ->
        st.copy(sets = st.sets.map { if (it.id == id) it.copy(syncState = SYNC_FAILED, syncError = code) else it })
    }

    override suspend fun setSyncState(id: String, syncState: String) = write { st ->
        val session = st.sessions[id] ?: return@write st
        st.copy(sessions = st.sessions + (id to session.copy(syncState = syncState)))
    }

    override fun observeUploadCounts(ownerId: String): Flow<UploadCounts> = state.map { st ->
        val done = st.sessions.values.filter { it.ownerId == ownerId && it.status == STATUS_FINISHED }
        val mine = st.sessions.values.filter { it.ownerId == ownerId }.map { it.id }.toSet()
        UploadCounts(
            done.count { it.syncState == SYNC_PENDING },
            done.count { it.syncState == SYNC_FAILED && !it.failureSeen },
            st.sets.count { it.sessionId in mine && it.syncState == SYNC_FAILED && !it.failureSeen },
        )
    }.distinctUntilChanged()

    override suspend fun markSessionFailuresSeen(ownerId: String) = write { st ->
        st.copy(sessions = st.sessions.mapValues { (_, s) ->
            if (s.ownerId == ownerId && s.syncState == SYNC_FAILED) s.copy(failureSeen = true) else s
        })
    }

    override suspend fun markSetFailuresSeen(ownerId: String) = write { st ->
        val mine = st.sessions.values.filter { it.ownerId == ownerId }.map { it.id }.toSet()
        st.copy(sets = st.sets.map { if (it.sessionId in mine && it.syncState == SYNC_FAILED) it.copy(failureSeen = true) else it })
    }

    // Atómico como el @Transaction de Room.
    override suspend fun dismissFailures(ownerId: String) = write { st ->
        val mine = st.sessions.filterValues { it.ownerId == ownerId }.keys
        st.copy(
            sessions = st.sessions.mapValues { (_, s) ->
                if (s.ownerId == ownerId && s.syncState == SYNC_FAILED) s.copy(failureSeen = true) else s
            },
            sets = st.sets.map { if (it.sessionId in mine && it.syncState == SYNC_FAILED) it.copy(failureSeen = true) else it },
        )
    }

    override fun observeSessionUpload(id: String): Flow<SessionUploadRow?> = state.map { st ->
        st.sessions[id]?.let { s -> SessionUploadRow(s.syncState, st.sets.count { it.sessionId == id && it.syncState == SYNC_FAILED }) }
    }.distinctUntilChanged()

    // Atómicos como el @Transaction de Room: el Flow nunca emite un estado a medias.
    override suspend fun start(session: WorkoutSessionEntity, exercises: List<WorkoutExerciseEntity>) {
        check(getActive(session.ownerId) == null) { "Ya hay una sesión abierta" }
        write { it.copy(sessions = it.sessions + (session.id to session), exercises = it.exercises + exercises) }
    }

    override suspend fun saveSet(set: WorkoutSetEntity, session: WorkoutSessionEntity) = write { st ->
        st.copy(sessions = st.sessions + (session.id to session), sets = st.sets.filterNot { it.id == set.id } + set)
    }

    /**
     * Con un gate, cada escritura publica y recién vuelve al llamador cuando se completa: así el test ve
     * lo que Room emite mientras el repositorio todavía no devolvió (el orden real de producción).
     */
    var gate: CompletableDeferred<Unit>? = null

    private suspend fun write(change: (State) -> State) {
        check(!failWrites) { "Room falló" }
        state.update(change)
        gate?.await()
    }
}
