package com.fittrainer.ui.students.overview

import com.fittrainer.data.students.overview.FeedbackItem
import com.fittrainer.data.students.overview.RiskItem
import com.fittrainer.data.students.overview.StudentItem
import com.fittrainer.data.students.overview.StudentStatus
import com.fittrainer.data.students.overview.TodayItem
import com.fittrainer.data.students.overview.TrainerOverview
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class HomeTextsTest {

    // 01/11 15:00 en Argentina.
    private val now = Instant.parse("2026-11-01T18:00:00Z")

    private fun pending(name: String, planned: Boolean = true) = TodayItem("id-$name", name, planned, false, null, null, null, null)
    private fun done(name: String, planned: Boolean = true) = TodayItem("id-$name", name, planned, true, "x", "Push", now, 8)
    private fun overview(vararg today: TodayItem) = TrainerOverview(5, null, null, today.toList(), emptyList(), emptyList(), emptyList())

    @Test fun `tiempo relativo`() {
        assertEquals("hace un momento", relativeTime(now.minusSeconds(30), now))
        assertEquals("hace 12 min", relativeTime(now.minusSeconds(12 * 60), now))
        assertEquals("hace 1 h", relativeTime(now.minusSeconds(70 * 60), now))
        // 31/10 22:00 en Argentina: ayer, aunque sean menos de 24 h.
        assertEquals("ayer", relativeTime(Instant.parse("2026-11-01T01:00:00Z"), now))
        assertEquals("28/10", relativeTime(Instant.parse("2026-10-28T15:00:00Z"), now))
    }

    @Test fun `tarjeta del dia`() {
        assertEquals("Hoy no hay entrenamientos planificados", dayTitle(overview(done("Beto", planned = false))))
        assertEquals("Si alguien entrena igual, aparece en Hoy", daySubtitle(overview()))
        assertEquals("Falta 1 alumno", dayTitle(overview(pending("José"), done("Ana"))))
        assertEquals("José", daySubtitle(overview(pending("José"), done("Ana"))))
        assertEquals("Faltan 3 alumnos", dayTitle(overview(pending("José"), pending("Lu"), pending("Mora"))))
        assertEquals("José y 2 más", daySubtitle(overview(pending("José"), pending("Lu"), pending("Mora"))))
        // El que entrenó sin tenerlo asignado no cuenta en el anillo.
        val allDone = overview(done("Ana"), done("Beto", planned = false))
        assertEquals("Todos entrenaron hoy", dayTitle(allDone))
        assertEquals("1 de 1 terminaron su sesión", daySubtitle(allDone))
    }

    @Test fun `lineas de cada filtro`() {
        assertEquals("Le toca hoy · todavía no entrenó", todayLine(pending("José")))
        assertEquals("Terminó 15:00 · Push · RPE 8", todayLine(done("Ana")))
        assertEquals("Terminó 15:00", todayLine(TodayItem("s", "A", false, true, "x", null, now, null)))
        assertEquals("9 días sin entrenar", riskLine(RiskItem("s", "A", 9, false)))
        assertEquals("Nunca entrenó · alta hace 8 días", riskLine(RiskItem("s", "A", 8, true)))
        assertEquals("Push · RPE 8 · hace 12 min", feedbackLine(FeedbackItem("s", "A", "x", "Push", now.minusSeconds(720), 8), now))
        assertEquals("Sin rutina · ayer", feedbackLine(FeedbackItem("s", "A", "x", null, Instant.parse("2026-11-01T01:00:00Z"), null), now))
        assertEquals("Entrenó hoy", studentLine(StudentItem("s", "A", StudentStatus.ACTIVE, 0, 50)))
        assertEquals("Entrenó ayer", studentLine(StudentItem("s", "A", StudentStatus.ACTIVE, 1, 50)))
        assertEquals("Entrenó hace 3 días", studentLine(StudentItem("s", "A", StudentStatus.ACTIVE, 3, 50)))
        assertEquals("Nuevo · todavía no entrenó", studentLine(StudentItem("s", "A", StudentStatus.NEW, 2, null)))
        assertEquals("12 días sin entrenar", studentLine(StudentItem("s", "A", StudentStatus.INACTIVE, 12, null)))
    }

    @Test fun `adherencia y variaciones`() {
        assertEquals("Adherencia promedio 58% · +48% vs. semana anterior", adherenceSummary(58, 48))
        assertEquals("Adherencia promedio 58% · −3% vs. semana anterior", adherenceSummary(58, -3))
        assertEquals("Adherencia promedio 58%", adherenceSummary(58, null))
        assertNull(adherenceSummary(null, null))
        assertEquals("0%", deltaLabel(0))
        assertEquals("87%", pctLabel(87))
        assertEquals("sin plan", pctLabel(null))
    }

    @Test fun `contadores de los filtros`() {
        val o = overview(pending("José"), done("Ana")).copy(atRisk = listOf(RiskItem("s", "A", 9, false)))
        assertEquals(2, filterCount(o, HomeFilter.TODAY))
        assertEquals(1, filterCount(o, HomeFilter.RISK))
        assertEquals(0, filterCount(o, HomeFilter.FEEDBACK))
        assertEquals(5, filterCount(o, HomeFilter.STUDENTS))
        assertEquals("1 pendiente", filterCaption(o, HomeFilter.TODAY))
        assertEquals("0 pendientes", filterCaption(overview(done("Ana")), HomeFilter.TODAY))
        assertEquals("sin plan asignado", filterCaption(o, HomeFilter.STUDENTS))
        assertEquals("58% adherencia", filterCaption(o.copy(adherencePct = 58), HomeFilter.STUDENTS))
    }

    @Test fun `cabecera`() {
        assertEquals("DOMINGO · 1 NOV", headerDate(LocalDate.of(2026, 11, 1)))
        assertEquals("Hola, Profe", greeting("Profe Card 8"))
    }
}
