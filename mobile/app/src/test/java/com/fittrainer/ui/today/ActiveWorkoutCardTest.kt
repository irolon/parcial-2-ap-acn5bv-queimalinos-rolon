package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.testing.fakes.workout.workout
import java.time.DayOfWeek
import java.time.Instant
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ActiveWorkoutCardTest {

    private fun routine(id: String) = Routine(id, "Rutina $id", null, setOf(DayOfWeek.MONDAY), Instant.EPOCH, emptyList())

    // workout() de los fixtures es de la rutina "rt-1".
    private val active = workout()

    @Test fun `con sesion abierta y Hoy sin rutina para entrenar se puede continuar`() {
        assertTrue(showsActiveWorkoutCard(TodayContent.Rest(routine("rt-1"), setOf(DayOfWeek.MONDAY), DayOfWeek.MONDAY), active))
        assertTrue(showsActiveWorkoutCard(TodayContent.NoRoutine, active))
        assertTrue(showsActiveWorkoutCard(TodayContent.NeverSynced, active))
        assertTrue(showsActiveWorkoutCard(null, active))
    }

    @Test fun `en Training con la sesion de otra rutina tambien aparece`() {
        assertTrue(showsActiveWorkoutCard(TodayContent.Training(routine("rt-2")), active))
    }

    @Test fun `una sesion sin rutina no es la de Hoy`() {
        assertTrue(showsActiveWorkoutCard(TodayContent.Training(routine("rt-1")), active.copy(routineId = null)))
    }

    @Test fun `en Training con la sesion de esa rutina lo hace el hero`() {
        assertFalse(showsActiveWorkoutCard(TodayContent.Training(routine("rt-1")), active))
    }

    @Test fun `sin sesion abierta no aparece`() {
        assertFalse(showsActiveWorkoutCard(TodayContent.Training(routine("rt-1")), null))
        assertFalse(showsActiveWorkoutCard(TodayContent.NoRoutine, null))
        assertFalse(showsActiveWorkoutCard(TodayContent.Rest(routine("rt-1"), emptySet(), null), null))
    }
}
