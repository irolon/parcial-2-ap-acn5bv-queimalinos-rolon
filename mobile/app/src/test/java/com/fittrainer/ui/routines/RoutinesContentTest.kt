package com.fittrainer.ui.routines

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineCache
import com.fittrainer.data.routine.RoutineExercise
import java.time.DayOfWeek.FRIDAY
import java.time.DayOfWeek.MONDAY
import java.time.DayOfWeek.WEDNESDAY
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RoutinesContentTest {

    private val monday = LocalDate.of(2026, 10, 19)
    private val synced = Instant.parse("2026-10-19T09:00:00Z")

    private fun exercise(i: Int) = RoutineExercise("re-$i", "ex-$i", "Ej $i", "chest", null, null, 3, 10, 60, 40.0, null, null)

    private fun routine(id: String, days: Set<java.time.DayOfWeek>, created: String, n: Int = 2, goal: String? = "strength") =
        Routine(id, "Rutina $id", goal, days, Instant.parse(created), (0 until n).map(::exercise))

    @Test fun `sin sincronizar nunca`() {
        assertEquals(RoutinesContent.NeverSynced, routinesContent(RoutineCache(emptyList(), null), monday))
    }

    @Test fun `sincronizo sin rutinas`() {
        assertEquals(RoutinesContent.Empty, routinesContent(RoutineCache(emptyList(), synced), monday))
    }

    @Test fun `ordena de la mas nueva a la mas vieja y arma la tarjeta`() {
        val old = routine("a", setOf(FRIDAY, MONDAY), "2026-10-01T10:00:00Z", n = 1, goal = null)
        val new = routine("b", setOf(WEDNESDAY), "2026-10-10T10:00:00Z")
        val cards = (routinesContent(RoutineCache(listOf(old, new), synced), monday) as RoutinesContent.Routines).cards

        assertEquals(listOf("b", "a"), cards.map { it.id })
        assertEquals(listOf("L", "V"), cards[1].dayInitials) // lunes → domingo, no el orden del Set
        assertEquals("lunes, viernes", cards[1].dayNames)
        assertEquals("1 ejercicio", cards[1].exercisesText)
        assertEquals("2 ejercicios", cards[0].exercisesText)
        assertNull(cards[1].goal)
        assertEquals("Ganar fuerza", cards[0].goal)
    }

    @Test fun `la marca Hoy va solo en la rutina que muestra Hoy`() {
        val older = routine("a", setOf(MONDAY), "2026-10-01T10:00:00Z")
        val newer = routine("b", setOf(MONDAY), "2026-10-10T10:00:00Z")
        val other = routine("c", setOf(WEDNESDAY), "2026-10-05T10:00:00Z")
        val cards = (routinesContent(RoutineCache(listOf(older, newer, other), synced), monday) as RoutinesContent.Routines).cards

        assertEquals(listOf("b"), cards.filter { it.isToday }.map { it.id })
    }

    @Test fun `rutina sin dias no tiene chips ni marca`() {
        val card = (routinesContent(RoutineCache(listOf(routine("a", emptySet(), "2026-10-01T10:00:00Z")), synced), monday)
            as RoutinesContent.Routines).cards.single()
        assertEquals(emptyList<String>(), card.dayInitials)
        assertEquals(false, card.isToday)
    }
}
