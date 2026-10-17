package com.fittrainer.data.routine

import java.time.DayOfWeek
import java.time.DayOfWeek.FRIDAY
import java.time.DayOfWeek.MONDAY
import java.time.DayOfWeek.THURSDAY
import java.time.DayOfWeek.TUESDAY
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class TodayResolverTest {

    private val monday = LocalDate.of(2026, 10, 19)
    private val saturday = LocalDate.of(2026, 10, 24)

    private fun routine(id: String, days: Set<DayOfWeek>, createdAt: Long = 0L) =
        Routine(id, "Rutina $id", null, days, Instant.ofEpochMilli(createdAt), emptyList())

    @Test fun `las fechas de prueba son lunes y sabado`() {
        assertEquals(MONDAY, monday.dayOfWeek)
        assertEquals(DayOfWeek.SATURDAY, saturday.dayOfWeek)
    }

    @Test fun `nunca sincronizo es NeverSynced`() {
        assertEquals(TodayContent.NeverSynced, resolveToday(emptyList(), monday, everSynced = false))
    }

    @Test fun `sincronizado sin rutinas es NoRoutine`() {
        assertEquals(TodayContent.NoRoutine, resolveToday(emptyList(), monday, everSynced = true))
    }

    @Test fun `hoy toca entrenar devuelve Training`() {
        val push = routine("push", setOf(MONDAY, THURSDAY))
        assertEquals(TodayContent.Training(push), resolveToday(listOf(push), monday, everSynced = true))
    }

    @Test fun `empate de dias gana la rutina mas reciente`() {
        val vieja = routine("vieja", setOf(MONDAY), createdAt = 1_000L)
        val nueva = routine("nueva", setOf(MONDAY), createdAt = 2_000L)
        assertEquals(TodayContent.Training(nueva), resolveToday(listOf(vieja, nueva), monday, everSynced = true))
    }

    @Test fun `hoy no toca devuelve Rest con el proximo dia`() {
        val r = routine("r", setOf(THURSDAY))
        assertEquals(TodayContent.Rest(r, setOf(THURSDAY), THURSDAY), resolveToday(listOf(r), monday, everSynced = true))
    }

    @Test fun `el proximo dia cruza el domingo`() {
        val r = routine("r", setOf(TUESDAY))
        assertEquals(TodayContent.Rest(r, setOf(TUESDAY), TUESDAY), resolveToday(listOf(r), saturday, everSynced = true))
    }

    @Test fun `el proximo dia y la semana miran todas las rutinas y Rest muestra la mas reciente`() {
        val vieja = routine("vieja", setOf(TUESDAY), createdAt = 1_000L)
        val nueva = routine("nueva", setOf(FRIDAY), createdAt = 2_000L)
        assertEquals(
            TodayContent.Rest(nueva, setOf(TUESDAY, FRIDAY), TUESDAY),
            resolveToday(listOf(vieja, nueva), monday, everSynced = true),
        )
    }

    // Review Focus 2: rutina activa sin días cargados.
    @Test fun `rutina sin dias es Rest sin proximo dia`() {
        val r = routine("r", emptySet())
        assertEquals(TodayContent.Rest(r, emptySet(), null), resolveToday(listOf(r), monday, everSynced = true))
    }

    @Test fun `parseDays ignora mayusculas, espacios y valores desconocidos`() {
        assertEquals(setOf(MONDAY, FRIDAY), parseDays(listOf("monday", "FRIDAY ", "funday", "")))
    }
}
