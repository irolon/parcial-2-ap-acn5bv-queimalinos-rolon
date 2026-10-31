package com.fittrainer.testing.fakes.workout

import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao.State

/** Los conteos y marcas de "visto" del [FakeWorkoutDao], como funciones puras sobre el estado. */
internal fun State.uploadCounts(ownerId: String): UploadCounts {
    val done = sessions.values.filter { it.ownerId == ownerId && it.status == STATUS_FINISHED }
    val mine = sessions.values.filter { it.ownerId == ownerId }.map { it.id }.toSet()
    return UploadCounts(
        done.count { it.syncState == SYNC_PENDING },
        done.count { it.syncState == SYNC_FAILED && !it.failureSeen },
        sets.count { it.sessionId in mine && it.syncState == SYNC_FAILED && !it.failureSeen },
        done.count { it.syncState == SYNC_SYNCED && it.feedbackState == FEEDBACK_PENDING },
    )
}

internal fun State.withSessionFailuresSeen(ownerId: String): State = copy(
    sessions = sessions.mapValues { (_, s) ->
        if (s.ownerId == ownerId && s.syncState == SYNC_FAILED) s.copy(failureSeen = true) else s
    },
)

internal fun State.withSetFailuresSeen(ownerId: String): State {
    val mine = sessions.values.filter { it.ownerId == ownerId }.map { it.id }.toSet()
    return copy(sets = sets.map { if (it.sessionId in mine && it.syncState == SYNC_FAILED) it.copy(failureSeen = true) else it })
}

internal fun State.sessionUpload(id: String): SessionUploadRow? =
    sessions[id]?.let { s -> SessionUploadRow(s.syncState, sets.count { it.sessionId == id && it.syncState == SYNC_FAILED }) }

/** Las terminadas del dueño con sus detalles, de la más nueva a la más vieja (lo que devuelve observeForHistory). */
internal fun historyRows(st: State, ownerId: String): List<com.fittrainer.data.db.workout.WorkoutWithDetails> =
    st.sessions.values.filter { it.ownerId == ownerId && it.status == STATUS_FINISHED }
        .sortedByDescending { it.startedAt }
        .map { s -> com.fittrainer.data.db.workout.WorkoutWithDetails(s, st.exercises.filter { it.sessionId == s.id }, st.sets.filter { it.sessionId == s.id }) }
