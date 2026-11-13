package com.fittrainer.data.workout

import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.httpError
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runCurrent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class OpenSessionNotifierTest {

    private val scope = TestScope(StandardTestDispatcher())
    private val api = FakeSessionApi()
    private val notifier = OpenSessionNotifier(api, scope)
    private val started = Instant.parse("2026-11-13T10:00:00Z")

    @Test fun `open manda un create sin finished_at con el id la rutina y la hora ISO`() {
        notifier.open("u1", "s-1", "rt-1", started)
        scope.runCurrent()

        val body = api.created.single()
        assertEquals("s-1", body.id)
        assertEquals("rt-1", body.routineId)
        assertEquals("2026-11-13T10:00:00Z", body.startedAt)
        assertNull(body.finishedAt)
    }

    @Test fun `open no propaga un IOException`() {
        api.createError = IOException("sin red")

        notifier.open("u1", "s-1", "rt-1", started)
        scope.runCurrent()

        assertEquals(1, api.createCalls)
    }

    @Test fun `open no propaga un 500`() {
        api.createError = httpError(500)

        notifier.open("u1", "s-1", "rt-1", started)
        scope.runCurrent()

        assertEquals(1, api.createCalls)
    }

    @Test fun `close con la apertura en vuelo espera a que termine antes de borrar`() {
        val gate = CompletableDeferred<Unit>()
        api.createGate = gate
        notifier.open("u1", "s-1", "rt-1", started)
        scope.runCurrent()

        notifier.close("u1", "s-1")
        scope.runCurrent()
        assertEquals(listOf("create"), api.calls)

        gate.complete(Unit)
        scope.runCurrent()
        assertEquals(listOf("create", "discard"), api.calls)
        assertEquals(listOf("s-1"), api.discarded)
    }

    @Test fun `open que falla y despues close igual manda el discard`() {
        api.createError = IOException("sin red")
        notifier.open("u1", "s-1", "rt-1", started)
        scope.runCurrent()

        notifier.close("u1", "s-1")
        scope.runCurrent()

        assertEquals(listOf("create", "discard"), api.calls)
        assertEquals(listOf("s-1"), api.discarded)
    }

    @Test fun `close no propaga un 404`() {
        api.discardError = httpError(404)

        notifier.close("u1", "s-1")
        scope.runCurrent()

        assertEquals(listOf("s-1"), api.discarded)
    }

    @Test fun `close sin una apertura previa manda igual el discard`() {
        notifier.close("u1", "s-9")
        scope.runCurrent()

        assertEquals(listOf("discard"), api.calls)
        assertEquals(listOf("s-9"), api.discarded)
    }
}
