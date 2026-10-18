package com.fittrainer.ui.workout.service

import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
import com.fittrainer.testing.fakes.workout.workout
import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationTextsTest {

    @Test fun `la notificacion fija dice ejercicio y serie`() {
        val w = workout(cursor = Cursor(1, 2))
        assertEquals("Sesión en curso", ongoingTitle(w, resting = false))
        assertEquals("Descanso", ongoingTitle(w, resting = true))
        assertEquals("Ejercicio 1 · S2/2", ongoingText(w))
    }

    @Test fun `el fin del descanso anticipa la proxima serie`() {
        assertEquals("Próxima: 70 kg × 8", restDoneText(Load(70.0, 8)))
        assertEquals("Próxima: 62,5 kg × 10", restDoneText(Load(62.5, 10)))
    }
}
