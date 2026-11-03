package com.fittrainer.data.students.sessions

import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.data.workout.history.HistorySet
import com.fittrainer.testing.fakes.students.sessionDetail
import com.fittrainer.testing.fakes.students.sessionSummary
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerSessionMapperTest {

    @Test fun `el resumen se convierte como en el historial del alumno`() {
        val item = sessionSummary("a1", comment = "Bien").toItem()
        assertEquals(Instant.parse("2026-11-01T15:00:00Z"), item.startedAt)
        assertEquals("Push", item.routineName)
        assertEquals(HistoryOrigin.SERVER, item.origin)
        assertTrue(item.hasComment)
        assertFalse(item.commentUnread)
    }

    @Test fun `el detalle trae la sustitucion, el descanso real y el del plan`() {
        val detail = sessionDetail("a1").toTrainerEntity("t1", "s", previous = null).toDetail()
        val exercise = detail.exercises.single()
        assertEquals("Press inclinado", exercise.name)
        assertEquals("Press banca", exercise.originalName)
        assertEquals(30, exercise.plannedRestSeconds)
        assertEquals(listOf(HistorySet(1, 10, 40.0, 19), HistorySet(2, 10, 40.0, null)), exercise.sets)
        assertTrue(detail.detailLoaded)
        assertEquals("Bien", detail.notes)
    }

    @Test fun `sin detalle guardado detailLoaded es false`() {
        val row = sessionSummary("a1").toTrainerEntity("t1", "s", listed = true, exercisesJson = null)
        assertFalse(row.toDetail().detailLoaded)
    }

    @Test fun `comentario en blanco del servidor se guarda como null`() {
        assertNull(sessionSummary("a1", comment = "  ").toTrainerEntity("t1", "s", true, null).trainerComment)
    }

    @Test fun `el detalle se conserva solo si no cambio lo que lo afecta`() {
        val row = sessionDetail("a1").toTrainerEntity("t1", "s", previous = null)
        assertEquals(row.exercisesJson, row.keepDetailFor(sessionSummary("a1")))
        assertNull(row.keepDetailFor(sessionSummary("a1", sets = 3)))
    }
}
