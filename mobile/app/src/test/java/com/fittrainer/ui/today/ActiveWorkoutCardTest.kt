package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.TodayContent
import java.time.DayOfWeek
import java.time.Instant
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ActiveWorkoutCardTest {

    private val routine = Routine("rt-1", "Push", null, setOf(DayOfWeek.MONDAY), Instant.EPOCH, emptyList())

    @Test fun `con sesion abierta y Hoy sin rutina para entrenar se puede continuar`() {
        assertTrue(showsActiveWorkoutCard(TodayContent.Rest(routine, setOf(DayOfWeek.MONDAY), DayOfWeek.MONDAY), true))
        assertTrue(showsActiveWorkoutCard(TodayContent.NoRoutine, true))
        assertTrue(showsActiveWorkoutCard(TodayContent.NeverSynced, true))
        assertTrue(showsActiveWorkoutCard(null, true))
    }

    @Test fun `en Training lo hace el hero y sin sesion abierta no aparece`() {
        assertFalse(showsActiveWorkoutCard(TodayContent.Training(routine), true))
        assertFalse(showsActiveWorkoutCard(TodayContent.NoRoutine, false))
        assertFalse(showsActiveWorkoutCard(TodayContent.Rest(routine, emptySet(), null), false))
    }
}
