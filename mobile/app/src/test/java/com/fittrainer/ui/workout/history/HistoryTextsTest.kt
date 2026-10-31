package com.fittrainer.ui.workout.history

import com.fittrainer.data.workout.history.HistorySet
import java.time.Instant
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class HistoryTextsTest {
    private val ar = ZoneId.of("America/Argentina/Buenos_Aires")

    @Test fun fechaCortaEnHoraArgentina() {
        assertEquals("Jue 29 oct", historyDate(Instant.parse("2026-10-30T01:00:00Z"), ar))
    }

    @Test fun lineaDeResumen() {
        assertEquals("54 min · 18 series · 4.210,5 kg", historyLine(54, 18, 4210.5))
        assertEquals("1 serie · 80 kg", historyLine(null, 1, 80.0))
    }

    @Test fun seriesConYSinKg() {
        assertEquals("S1 · 62,5 kg × 10", setLine(HistorySet(1, 10, 62.5)))
        assertEquals("S2 · 10 reps", setLine(HistorySet(2, 10, null)))
        assertEquals("S3 · 10 reps", setLine(HistorySet(3, 10, 0.0)))
    }

    @Test fun planCompletoParcialYVacio() {
        assertEquals("Plan: 4 × 10 · 60 kg", planLine(4, 10, 60.0))
        assertEquals("Plan: 4 series", planLine(4, null, null))
        assertNull(planLine(null, null, null))
    }

    @Test fun badgeDeSinLeerTopeaEnNueveMas() {
        assertEquals("1", unreadBadgeText(1))
        assertEquals("9", unreadBadgeText(9))
        assertEquals("9+", unreadBadgeText(10))
    }
}
