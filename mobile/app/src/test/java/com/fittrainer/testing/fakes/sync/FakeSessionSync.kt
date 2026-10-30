package com.fittrainer.testing.fakes.sync

import com.fittrainer.data.sync.SessionSync

class FakeSessionSync : SessionSync {
    /** El `newWork` de cada enqueue, en orden. */
    val enqueues = mutableListOf<Boolean>()
    val enqueued get() = enqueues.size
    /** Si no es null, enqueue lo tira (WorkManager o Room rotos). */
    var enqueueError: Throwable? = null
    var syncNowCalls = 0
    var syncNowResult = true
    /** Lo que "hace la pasada" durante syncNow (p. ej. marcar sesiones como subidas en el FakeWorkoutDao). */
    var onSyncNow: suspend () -> Unit = {}

    override suspend fun enqueue(newWork: Boolean) {
        enqueues += newWork
        enqueueError?.let { throw it }
    }

    override suspend fun syncNow(timeoutMs: Long): Boolean {
        syncNowCalls++
        onSyncNow()
        return syncNowResult
    }
}
