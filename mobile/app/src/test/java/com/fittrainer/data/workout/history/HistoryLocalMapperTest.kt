package com.fittrainer.data.workout.history

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.WorkoutWithDetails
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.pendingSet
import org.junit.Assert.assertEquals
import org.junit.Test

/** Sesiones del celular en el historial (revisión de la PR #40). */
class HistoryLocalMapperTest {
    private fun local(syncState: String = SYNC_PENDING, durationMs: Long = 60_000L) = finishedSession(syncState = syncState).let { s ->
        WorkoutWithDetails(s.copy(finishedAt = s.startedAt + durationMs), emptyList(), listOf(pendingSet("s1")))
    }

    @Test fun laQueElServidorRechazoTieneSuPropiaMarca() {
        assertEquals(HistoryOrigin.LOCAL_FAILED, local(SYNC_FAILED).toHistoryItem().origin)
        assertEquals(HistoryOrigin.LOCAL_PENDING, local(SYNC_PENDING).toHistoryItem().origin)
        assertEquals(HistoryOrigin.LOCAL_SYNCED, local(SYNC_SYNCED).toHistoryItem().origin)
    }

    @Test fun laDuracionRedondeaComoElBackend() {
        assertEquals(55, local(durationMs = 54 * 60_000L + 30_000L).toHistoryItem().durationMin)
        assertEquals(54, local(durationMs = 54 * 60_000L + 29_999L).toHistoryItem().durationMin)
    }

    @Test fun conElRelojAtrasadoLaDuracionEsCeroNuncaNegativa() {
        assertEquals(0, local(durationMs = -5 * 60_000L).toHistoryItem().durationMin)
    }
}
