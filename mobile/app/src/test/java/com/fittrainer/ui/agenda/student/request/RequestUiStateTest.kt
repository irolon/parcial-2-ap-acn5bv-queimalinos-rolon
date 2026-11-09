package com.fittrainer.ui.agenda.student.request

import com.fittrainer.ui.agenda.student.FREE_SLOTS_REFRESH_FAILED
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RequestUiStateTest {

    private val now = Instant.parse("2026-11-04T12:00:00Z")

    // Domingo 23 h de Argentina (lunes 02 h UTC): va en el domingo.
    @Test fun `agrupa por dia de Argentina, por hora y sin lo que ya empezo`() {
        val days = buildSlotDays(
            listOf(
                Instant.parse("2026-11-09T02:00:00Z"),
                Instant.parse("2026-11-08T21:00:00Z"),
                Instant.parse("2026-11-04T12:00:00Z"),
                Instant.parse("2026-11-04T11:00:00Z"),
            ),
            now,
        )
        assertEquals(listOf(LocalDate.parse("2026-11-08")), days.map { it.date })
        assertEquals(listOf(Instant.parse("2026-11-08T21:00:00Z"), Instant.parse("2026-11-09T02:00:00Z")), days.single().slots)
    }

    @Test fun `sin entrenador gana a los demas estados`() {
        val state = RequestUiState(loaded = true, noTrainer = true, failed = true, everSynced = true)
        assertTrue(state.showNoTrainer)
        assertFalse(state.showError)
        assertFalse(state.showEmpty)
        assertNull(state.notice)
    }

    @Test fun `los demas estados`() {
        assertTrue(RequestUiState(loaded = true).showLoading)
        assertTrue(RequestUiState(loaded = true, failed = true).showError)
        assertTrue(RequestUiState(loaded = true, offline = true).showNotLoaded)
        assertTrue(RequestUiState(loaded = true, everSynced = true).showEmpty)
        assertEquals(FREE_SLOTS_REFRESH_FAILED, RequestUiState(loaded = true, everSynced = true, failed = true).notice)
    }
}
