package com.fittrainer.ui.students.overview

import com.fittrainer.data.students.overview.AttentionItem
import com.fittrainer.data.students.overview.RecentItem
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class HomeTextsTest {

    // 01/11 15:00 en Argentina.
    private val now = Instant.parse("2026-11-01T18:00:00Z")

    @Test fun `tiempo relativo`() {
        assertEquals("hace un momento", relativeTime(now.minusSeconds(30), now))
        assertEquals("hace 12 min", relativeTime(now.minusSeconds(12 * 60), now))
        assertEquals("hace 1 h", relativeTime(now.minusSeconds(70 * 60), now))
        // 31/10 22:00 en Argentina: ayer, aunque sean menos de 24 h.
        assertEquals("ayer", relativeTime(Instant.parse("2026-11-01T01:00:00Z"), now))
        assertEquals("28/10", relativeTime(Instant.parse("2026-10-28T15:00:00Z"), now))
    }

    @Test fun `variaciones y contadores`() {
        assertEquals("+2", newLabel(2))
        assertEquals("", newLabel(0))
        assertEquals("de 11", expectedLabel(11))
        assertEquals("+4%", deltaLabel(4))
        assertEquals("−3%", deltaLabel(-3))
        assertEquals("0%", deltaLabel(0))
        assertEquals("", deltaLabel(null))
        assertEquals("87%", pctLabel(87))
        assertEquals("—", pctLabel(null))
    }

    @Test fun `lineas de atencion y actividad`() {
        assertEquals("9 días sin entrenar", attentionLine(AttentionItem.AtRisk("s", "A", 9, false)))
        assertEquals("Nunca entrenó · alta hace 8 días", attentionLine(AttentionItem.AtRisk("s", "A", 8, true)))
        assertEquals("Feedback pendiente · Push", attentionLine(AttentionItem.FeedbackPending("s", "A", "x", "Push", now)))
        assertEquals("Push día 3 · RPE 8", recentLine(RecentItem("s", "A", "x", "Push día 3", 8, now)))
        assertEquals("Push día 3", recentLine(RecentItem("s", "A", "x", "Push día 3", null, now)))
        assertEquals("Sin rutina", recentLine(RecentItem("s", "A", "x", null, null, now)))
    }

    @Test fun `cabecera`() {
        assertEquals("DOMINGO · 1 NOV", headerDate(LocalDate.of(2026, 11, 1)))
        assertEquals("Hola, Profe", greeting("Profe Card 8"))
    }
}
