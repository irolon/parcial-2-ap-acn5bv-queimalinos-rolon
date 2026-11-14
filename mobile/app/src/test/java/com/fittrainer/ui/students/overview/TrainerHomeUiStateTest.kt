package com.fittrainer.ui.students.overview

import com.fittrainer.data.students.overview.InSessionItem
import com.fittrainer.data.students.overview.TrainerOverview
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerHomeUiStateTest {

    private val now = Instant.parse("2026-11-13T15:00:00Z")
    private val recent = InSessionItem("s1", "Ana", null, now.minusSeconds(10 * 60))
    private val stale = InSessionItem("s2", "Beto", null, now.minusSeconds(5 * 3600))

    private fun state(vararg items: InSessionItem) =
        TrainerHomeUiState(now = now, overview = TrainerOverview(0, null, null, emptyList(), emptyList(), emptyList(), emptyList(), items.toList()))

    @Test fun `en curso muestra la sesion de hace 10 min y oculta la de hace 5 h`() {
        assertEquals(listOf(recent), state(recent, stale).liveInSession)
    }

    @Test fun `si todas vencieron la seccion queda vacia`() {
        assertTrue(state(stale).liveInSession.isEmpty())
    }
}
