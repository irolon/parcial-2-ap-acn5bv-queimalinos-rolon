package com.fittrainer.testing.fakes.sync

import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.db.workout.WorkoutSetEntity

/** Sesión terminada: empezó a las 10:00:00 UTC del 17/10 y duró un minuto. */
fun finishedSession(
    id: String = "w1",
    owner: String = "u1",
    status: String = STATUS_FINISHED,
    syncState: String = SYNC_PENDING,
    startedAt: Long = 1_760_695_200_000L,
) = WorkoutSessionEntity(id, owner, "rt-1", "Push", startedAt, startedAt + 60_000L, status, syncState, 0, 1, null, null, null)

fun pendingSet(id: String, sessionId: String = "w1", setNumber: Int = 1) =
    WorkoutSetEntity(id, sessionId, 0, "ex-0", null, "re-0", setNumber, 40.0, 8, 1_760_695_230_000L + setNumber)
