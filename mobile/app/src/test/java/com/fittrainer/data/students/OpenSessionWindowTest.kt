package com.fittrainer.data.students

import java.time.Instant
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OpenSessionWindowTest {

    private val started = Instant.parse("2026-11-13T10:00:00Z")

    @Test fun `a los 10 min sigue vigente`() = assertTrue(isOpenSessionLive(started, started.plusSeconds(10 * 60)))

    @Test fun `a las 5 h ya vencio`() = assertFalse(isOpenSessionLive(started, started.plusSeconds(5 * 3600)))

    @Test fun `a las 4 h justas ya vencio`() = assertFalse(isOpenSessionLive(started, started.plus(OPEN_SESSION_WINDOW)))
}
