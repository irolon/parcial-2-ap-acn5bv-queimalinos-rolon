package com.fittrainer.ui.workout.service

import com.fittrainer.data.workout.restJustEnded
import java.time.Instant
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RestAlarmTest {
    private val now = Instant.parse("2026-10-17T12:00:00Z")

    @Test fun `descanso vencido al verlo por primera vez no suena`() {
        assertFalse(alarmAfterWait(0))
        assertFalse(restJustEnded(null, now.minusSeconds(600), now))
    }

    @Test fun `espera normal suena una vez`() {
        assertTrue(alarmAfterWait(30_000))
    }

    @Test fun `la pantalla lo cerro primero suena una vez`() {
        assertTrue(restJustEnded(now.minusSeconds(1), null, now))
    }

    @Test fun `saltar pausar o ajustar no suenan`() {
        val end = now.plusSeconds(30)
        assertFalse(restJustEnded(end, null, now))
        assertFalse(restJustEnded(end, now.plusSeconds(45), now))
    }
}
