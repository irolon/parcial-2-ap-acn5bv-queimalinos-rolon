package com.fittrainer.testing.fakes.history

import com.fittrainer.data.db.workout.history.HistoryCommentSeenEntity
import com.fittrainer.data.db.workout.history.HistoryDao
import com.fittrainer.data.db.workout.history.HistoryExerciseEntity
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.data.db.workout.history.HistorySetEntity
import com.fittrainer.data.db.workout.history.HistoryWithDetails
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Caché del historial en memoria, con el mismo cascade que Room. */
class FakeHistoryDao : HistoryDao() {
    data class State(
        val sessions: Map<String, HistorySessionEntity> = emptyMap(),
        val exercises: List<HistoryExerciseEntity> = emptyList(),
        val sets: List<HistorySetEntity> = emptyList(),
        val seen: List<HistoryCommentSeenEntity> = emptyList(),
    )

    val state = MutableStateFlow(State())

    /** Para probar qué escrituras caen dentro de una transacción y qué pasa justo antes de cerrarla. */
    val writes = mutableListOf<String>()
    var beforeCommit: (() -> Unit)? = null
    private var inTx = false

    override suspend fun inTransaction(block: suspend () -> Unit) {
        inTx = true
        try {
            block()
            beforeCommit?.invoke()
        } finally {
            inTx = false
        }
    }

    private fun ordered(st: State, owner: String) =
        st.sessions.values.filter { it.ownerId == owner }.sortedWith(compareByDescending<HistorySessionEntity> { it.startedAt }.thenByDescending { it.id })

    override fun observeSessions(ownerId: String): Flow<List<HistorySessionEntity>> = state.map { ordered(it, ownerId) }
    override fun observeDetail(ownerId: String, id: String): Flow<HistoryWithDetails?> = state.map { st ->
        st.sessions[id]?.takeIf { it.ownerId == ownerId }?.let { s ->
            HistoryWithDetails(s, st.exercises.filter { it.sessionId == id }, st.sets.filter { it.sessionId == id })
        }
    }
    override suspend fun sessions(ownerId: String) = ordered(state.value, ownerId)
    override suspend fun upsertSessions(sessions: List<HistorySessionEntity>) = state.update { st ->
        writes += "upsertSessions tx=$inTx"
        st.copy(sessions = st.sessions + sessions.associateBy { it.id })
    }
    override suspend fun insertIfAbsent(sessions: List<HistorySessionEntity>) = state.update { st ->
        writes += "insertIfAbsent tx=$inTx"
        st.copy(sessions = st.sessions + sessions.filter { it.id !in st.sessions }.associateBy { it.id })
    }
    override suspend fun deleteOthers(ownerId: String, keep: List<String>) = drop { it.ownerId == ownerId && it.id !in keep }
    override suspend fun deleteOthersInWindow(ownerId: String, keep: List<String>, oldestStartedAt: Long, oldestId: String) = drop {
        it.ownerId == ownerId && it.id !in keep && (it.startedAt > oldestStartedAt || (it.startedAt == oldestStartedAt && it.id > oldestId))
    }
    override suspend fun markOutOfLatest(ownerId: String, keep: List<String>) = state.update { st ->
        st.copy(sessions = st.sessions.mapValues { (_, s) -> if (s.ownerId == ownerId && s.id !in keep) s.copy(inLatest = false) else s })
    }
    override suspend fun exists(sessionId: String) = sessionId in state.value.sessions
    override suspend fun hasSession(ownerId: String, sessionId: String) = state.value.sessions[sessionId]?.ownerId == ownerId
    override suspend fun deleteExercises(sessionId: String) = state.update { st -> st.copy(exercises = st.exercises.filterNot { it.sessionId == sessionId }) }
    override suspend fun deleteSets(sessionId: String) = state.update { st -> st.copy(sets = st.sets.filterNot { it.sessionId == sessionId }) }
    override suspend fun insertExercises(exercises: List<HistoryExerciseEntity>) = state.update { it.copy(exercises = it.exercises + exercises) }
    override suspend fun insertSets(sets: List<HistorySetEntity>) = state.update { it.copy(sets = it.sets + sets) }
    override suspend fun markDetailLoaded(sessionId: String) = state.update { st ->
        val s = st.sessions[sessionId] ?: return@update st
        st.copy(sessions = st.sessions + (sessionId to s.copy(detailLoaded = true)))
    }
    override suspend fun deleteSessions(ownerId: String) = drop { it.ownerId == ownerId }
    override suspend fun deleteAllSessions() = drop { true }
    override suspend fun deleteSeen(ownerId: String) = state.update { st -> st.copy(seen = st.seen.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteAllSeen() = state.update { it.copy(seen = emptyList()) }

    override fun observeUnreadCount(ownerId: String): Flow<Int> = state.map { st ->
        ordered(st, ownerId).count { s ->
            !s.trainerComment.isNullOrBlank() && st.seen.none { it.sessionId == s.id && it.ownerId == ownerId && it.comment == s.trainerComment }
        }
    }
    override fun observeSeen(ownerId: String): Flow<List<HistoryCommentSeenEntity>> = state.map { st -> st.seen.filter { it.ownerId == ownerId } }
    override suspend fun markSeen(seen: HistoryCommentSeenEntity) = state.update { st ->
        st.copy(seen = st.seen.filterNot { it.sessionId == seen.sessionId } + seen)
    }

    private fun drop(predicate: (HistorySessionEntity) -> Boolean) = state.update { st ->
        val gone = st.sessions.values.filter(predicate).map { it.id }.toSet()
        st.copy(sessions = st.sessions - gone, exercises = st.exercises.filterNot { it.sessionId in gone }, sets = st.sets.filterNot { it.sessionId in gone })
    }
}
