package com.fittrainer.testing.fakes.workout

import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.FEEDBACK_REJECTED
import com.fittrainer.data.db.workout.FEEDBACK_SYNCED
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

    /** El fake no ve el caché del historial: devuelve todas las terminadas y el filtro lo repite el repositorio. */
    override fun observeForHistory(ownerId: String): Flow<List<WorkoutWithDetails>> = state.map { st -> historyRows(st, ownerId) }

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

    override suspend fun saveFeedback(id: String, rpe: Int?, notes: String?) = write { st ->
        val s = st.sessions[id] ?: return@write st
        st.copy(sessions = st.sessions + (id to s.copy(rpe = rpe, notes = notes, feedbackState = if (s.syncState == SYNC_FAILED) FEEDBACK_REJECTED else FEEDBACK_PENDING)))
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

    override fun observeUploadCounts(ownerId: String): Flow<UploadCounts> =
        state.map { it.uploadCounts(ownerId) }.distinctUntilChanged()

    override suspend fun markSessionFailuresSeen(ownerId: String) = write { it.withSessionFailuresSeen(ownerId) }

    override suspend fun markSetFailuresSeen(ownerId: String) = write { it.withSetFailuresSeen(ownerId) }

    override fun observeSessionUpload(id: String): Flow<SessionUploadRow?> =
        state.map { it.sessionUpload(id) }.distinctUntilChanged()

    override suspend fun pendingFeedback(ownerId: String) = state.value.sessions.values
        .filter { it.ownerId == ownerId && it.status == STATUS_FINISHED && it.syncState == SYNC_SYNCED && it.feedbackState == FEEDBACK_PENDING }
        .sortedBy { it.startedAt }

    override suspend fun markFeedbackSynced(id: String, rpe: Int?, notes: String?) = write { st ->
        val s = st.sessions[id]?.takeIf { it.feedbackState == FEEDBACK_PENDING && it.rpe == rpe && it.notes == notes }
            ?: return@write st
        st.copy(sessions = st.sessions + (id to s.copy(feedbackState = FEEDBACK_SYNCED)))
    }

    override suspend fun markFeedbackRejected(id: String) = write { st ->
        val s = st.sessions[id] ?: return@write st
        st.copy(sessions = st.sessions + (id to s.copy(feedbackState = FEEDBACK_REJECTED)))
    }

    // Atómicos como el @Transaction de Room: el Flow nunca emite un estado a medias.
    override suspend fun start(session: WorkoutSessionEntity, exercises: List<WorkoutExerciseEntity>) {
        check(getActive(session.ownerId) == null) { "Ya hay una sesión abierta" }
        write { it.copy(sessions = it.sessions + (session.id to session), exercises = it.exercises + exercises) }
    }

    override suspend fun saveSet(set: WorkoutSetEntity, session: WorkoutSessionEntity) = write { st ->
        st.copy(sessions = st.sessions + (session.id to session), sets = st.sets.filterNot { it.id == set.id } + set)
    }

    override suspend fun saveSets(sets: List<WorkoutSetEntity>, session: WorkoutSessionEntity) = write { st ->
        val ids = sets.map { it.id }.toSet()
        st.copy(sessions = st.sessions + (session.id to session), sets = st.sets.filterNot { it.id in ids } + sets)
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
