package com.fittrainer.testing.fakes.sync

import com.fittrainer.data.sync.SessionSync

class FakeSessionSync : SessionSync {
    var enqueued = 0
    var syncNowCalls = 0
    var syncNowResult = true
    /** Lo que "hace la pasada" durante syncNow (p. ej. marcar sesiones como subidas en el FakeWorkoutDao). */
    var onSyncNow: suspend () -> Unit = {}

    override suspend fun enqueue() {
        enqueued++
    }

    override suspend fun syncNow(timeoutMs: Long): Boolean {
        syncNowCalls++
        onSyncNow()
        return syncNowResult
    }
}
