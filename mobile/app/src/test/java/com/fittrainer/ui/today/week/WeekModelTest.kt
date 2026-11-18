package com.fittrainer.ui.today.week

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

class WeekModelTest {
    private val martes17 = LocalDate.of(2026, 11, 17)

    private fun item(id: String, startedAt: String, origin: HistoryOrigin = HistoryOrigin.SERVER, pr: Boolean = false) = HistoryItem(
        id = id, startedAt = Instant.parse(startedAt), durationMin = 40, routineName = "Rutina", sets = 10,
        volumeKg = 1000.0, rpe = null, hasPr = pr, hasComment = false, origin = origin,
    )

    private fun routine(id: String, vararg days: DayOfWeek) = Routine(
        id = id, name = "R$id", goal = null, days = days.toSet(), createdAt = Instant.parse("2026-10-01T00:00:00Z"),
        exercises = emptyList(),
    )

    @Test
    fun `sessionDate usa hora argentina`() {
        assertEquals(LocalDate.of(2026, 11, 17), sessionDate(Instant.parse("2026-11-18T02:30:00Z")))
    }

    @Test
    fun `weekDates va de lunes a domingo`() {
        val semana = weekDates(martes17)
        assertEquals(7, semana.size)
        assertEquals(LocalDate.of(2026, 11, 16), semana.first())
        assertEquals(LocalDate.of(2026, 11, 22), semana.last())
        val domingo = weekDates(LocalDate.of(2026, 11, 22))
        assertEquals(LocalDate.of(2026, 11, 16), domingo.first())
        assertEquals(LocalDate.of(2026, 11, 22), domingo.last())
    }

    @Test
    fun `trainedDates ignora LOCAL_FAILED`() {
        val sesiones = listOf(
            item("a", "2026-11-16T15:00:00Z"),
            item("b", "2026-11-18T15:00:00Z", HistoryOrigin.LOCAL_FAILED),
        )
        assertEquals(setOf(LocalDate.of(2026, 11, 16)), trainedDates(sesiones))
    }

    private val asignados = setOf(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY)

    @Test
    fun `weekStats cuenta días distintos y asignados`() {
        val sesiones = listOf(
            item("a", "2026-11-16T12:00:00Z"),
            item("b", "2026-11-16T20:00:00Z"),
            item("c", "2026-11-18T15:00:00Z", HistoryOrigin.LOCAL_FAILED),
        )
        val stats = weekStats(sesiones, asignados, martes17)
        assertEquals(1, stats.doneDays)
        assertEquals(3, stats.assignedDays)
        assertEquals(2, stats.monthSessions)
    }

    @Test
    fun `weekStats cuenta las sesiones del mes y no las de otro`() {
        val sesiones = listOf(item("a", "2026-11-16T12:00:00Z"), item("b", "2026-10-30T12:00:00Z"))
        assertEquals(1, weekStats(sesiones, asignados, martes17).monthSessions)
    }

    @Test
    fun `monthPrs cuenta las sesiones con récord del mes`() {
        val sesiones = listOf(
            item("a", "2026-11-16T12:00:00Z", pr = true),
            item("b", "2026-11-10T12:00:00Z", pr = true),
            item("c", "2026-11-12T12:00:00Z"),
            item("d", "2026-10-30T12:00:00Z", pr = true),
            item("e", "2026-11-13T12:00:00Z", HistoryOrigin.LOCAL_FAILED, pr = true),
        )
        assertEquals(2, weekStats(sesiones, asignados, martes17).monthPrs)
    }

    @Test
    fun `weekStats puede pasar de lo asignado`() {
        val sesiones = listOf(
            item("a", "2026-11-16T15:00:00Z"), item("b", "2026-11-17T15:00:00Z"),
            item("c", "2026-11-18T15:00:00Z"), item("d", "2026-11-19T15:00:00Z"),
        )
        val stats = weekStats(sesiones, asignados, LocalDate.of(2026, 11, 19))
        assertEquals(4, stats.doneDays)
        assertEquals(3, stats.assignedDays)
    }

    @Test
    fun `nextTraining busca el próximo día con rutina`() {
        val rutina = routine("1", DayOfWeek.WEDNESDAY)
        val proximo = nextTraining(listOf(rutina), martes17)
        assertEquals(LocalDate.of(2026, 11, 18), proximo?.date)
        assertEquals(rutina, proximo?.routine)
        assertEquals(LocalDate.of(2026, 11, 25), nextTraining(listOf(rutina), LocalDate.of(2026, 11, 18))?.date)
        assertNull(nextTraining(emptyList(), martes17))
    }

    @Test
    fun `nextTraining toma la primera rutina de la lista si comparten día`() {
        val a = routine("a", DayOfWeek.WEDNESDAY)
        val b = routine("b", DayOfWeek.WEDNESDAY)
        assertEquals(a, nextTraining(listOf(a, b), martes17)?.routine)
    }

    @Test
    fun `dayView de hoy es Today`() {
        assertEquals(DayView.Today, dayView(martes17, martes17, emptyList(), emptyList()))
    }

    @Test
    fun `dayView de un día pasado con sesión es Past asignado`() {
        val vieja = item("a", "2026-11-16T12:00:00Z")
        val nueva = item("b", "2026-11-16T20:00:00Z")
        val vista = dayView(
            LocalDate.of(2026, 11, 16), martes17, listOf(vieja, nueva), listOf(routine("1", DayOfWeek.MONDAY)),
        ) as DayView.Past
        assertEquals(listOf(nueva, vieja), vista.sessions)
        assertTrue(vista.assigned)
    }

    @Test
    fun `dayView de un día pasado sin sesión es Past, asignado o no según la rutina`() {
        val vista = dayView(
            LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 18), emptyList(), listOf(routine("1", DayOfWeek.MONDAY)),
        )
        assertEquals(DayView.Past(LocalDate.of(2026, 11, 16), emptyList(), true), vista)
        val martes = dayView(martes17, LocalDate.of(2026, 11, 18), emptyList(), listOf(routine("1", DayOfWeek.MONDAY)))
        assertEquals(DayView.Past(martes17, emptyList(), false), martes)
    }

    @Test
    fun `dayView de un día pasado ignora LOCAL_FAILED`() {
        val fallida = item("a", "2026-11-16T12:00:00Z", HistoryOrigin.LOCAL_FAILED)
        val vista = dayView(LocalDate.of(2026, 11, 16), martes17, listOf(fallida), emptyList()) as DayView.Past
        assertTrue(vista.sessions.isEmpty())
    }

    @Test
    fun `dayView de un día futuro trae la rutina o null`() {
        val rutina = routine("1", DayOfWeek.THURSDAY)
        assertEquals(DayView.Future(LocalDate.of(2026, 11, 19), rutina),
            dayView(LocalDate.of(2026, 11, 19), martes17, emptyList(), listOf(rutina)))
        assertEquals(DayView.Future(LocalDate.of(2026, 11, 21), null, NextTraining(LocalDate.of(2026, 11, 26), rutina)),
            dayView(LocalDate.of(2026, 11, 21), martes17, emptyList(), listOf(rutina)))
    }

    @Test
    fun `dayView de un día de descanso futuro sin más entrenos no trae after`() {
        val vista = dayView(LocalDate.of(2026, 11, 21), martes17, emptyList(), emptyList())
        assertNull((vista as DayView.Future).after)
    }

    @Test
    fun alVolverDeUnDetalleSeConservaElDiaElegido() {
        val hoy = LocalDate.of(2026, 11, 18)
        assertEquals(LocalDate.of(2026, 11, 16), selectionAfterStart(hoy, hoy, LocalDate.of(2026, 11, 16)))
    }

    @Test
    fun alCambiarElDiaSeVuelveAHoy() {
        val ayer = LocalDate.of(2026, 11, 18)
        assertEquals(ayer.plusDays(1), selectionAfterStart(ayer, ayer.plusDays(1), ayer))
    }

    @Test
    fun conLaSeleccionFueraDeLaSemanaSeVuelveAHoy() {
        val hoy = LocalDate.of(2026, 11, 18)
        assertEquals(hoy, selectionAfterStart(hoy, hoy, LocalDate.of(2026, 11, 10)))
    }
}
