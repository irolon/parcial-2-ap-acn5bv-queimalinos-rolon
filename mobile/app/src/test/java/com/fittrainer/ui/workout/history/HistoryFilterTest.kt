package com.fittrainer.ui.workout.history

import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import org.junit.Assert.assertEquals
import org.junit.Test

class HistoryFilterTest {
    private fun item(
        id: String,
        at: String,
        pr: Boolean = false,
        comment: Boolean = false,
        unread: Boolean = false,
        origin: HistoryOrigin = HistoryOrigin.SERVER,
        min: Int? = 50,
        kg: Double = 100.0,
    ) = HistoryItem(id, Instant.parse(at), min, "Push", 3, kg, null, pr, comment, origin, unread)

    // Viernes 30/10/2026 12:00 UTC: la semana va del lunes 26 al domingo 1/11.
    private val now = Instant.parse("2026-10-30T12:00:00Z")
    private val week = weekBounds(now, ZoneOffset.UTC)
    private fun ids(items: List<HistoryItem>, f: HistoryFilter) = filterHistory(items, f, week.first, week.second).map { it.id }

    @Test fun laSemanaVaDeLunes0000AlLunesSiguiente() {
        assertEquals(Instant.parse("2026-10-26T00:00:00Z"), week.first)
        assertEquals(Instant.parse("2026-11-02T00:00:00Z"), week.second)
    }

    @Test fun estaSemanaIncluyeLosBordes() {
        val items = listOf(
            item("antes", "2026-10-25T23:59:59Z"),
            item("lunes", "2026-10-26T00:00:00Z"),
            item("domingo", "2026-11-01T23:59:59Z"),
            item("despues", "2026-11-02T00:00:00Z"),
        )
        assertEquals(listOf("lunes", "domingo"), ids(items, HistoryFilter.WEEK))
    }

    @Test fun laSemanaSeCuentaEnLaZonaDelCelular() {
        val ar = weekBounds(Instant.parse("2026-10-26T01:00:00Z"), ZoneId.of("America/Argentina/Buenos_Aires")) // domingo 25 22:00 en AR
        assertEquals(Instant.parse("2026-10-19T03:00:00Z"), ar.first)
        assertEquals(Instant.parse("2026-10-26T03:00:00Z"), ar.second)
    }

    @Test fun todosNoFiltra() {
        val items = listOf(item("a", "2026-01-01T00:00:00Z"), item("b", "2026-10-30T00:00:00Z"))
        assertEquals(listOf("a", "b"), ids(items, HistoryFilter.ALL))
    }

    @Test fun recordsYSinSubir() {
        val items = listOf(
            item("pr", "2026-10-30T00:00:00Z", pr = true),
            item("loc", "2026-10-30T00:00:00Z", origin = HistoryOrigin.LOCAL_PENDING),
            item("ok", "2026-10-30T00:00:00Z", origin = HistoryOrigin.LOCAL_SYNCED),
            item("rechazada", "2026-10-30T00:00:00Z", origin = HistoryOrigin.LOCAL_FAILED),
        )
        assertEquals(listOf("pr"), ids(items, HistoryFilter.RECORDS))
        assertEquals(listOf("loc"), ids(items, HistoryFilter.PENDING))
    }

    @Test fun comentadosPonePrimeroLosSinLeerYDespuesPorFecha() {
        val items = listOf(
            item("leido-nuevo", "2026-10-29T00:00:00Z", comment = true),
            item("sin", "2026-10-01T00:00:00Z"),
            item("nuevo-viejo", "2026-09-01T00:00:00Z", comment = true, unread = true),
            item("leido-viejo", "2026-08-01T00:00:00Z", comment = true),
            item("nuevo-reciente", "2026-10-20T00:00:00Z", comment = true, unread = true),
        )
        assertEquals(listOf("nuevo-reciente", "nuevo-viejo", "leido-nuevo", "leido-viejo"), ids(items, HistoryFilter.COMMENTED))
    }

    @Test fun resumenSemanalConEntrenamientos() {
        val items = listOf(
            item("a", "2026-10-26T10:00:00Z", min = 60, kg = 5000.0),
            item("b", "2026-10-28T10:00:00Z", min = 45, kg = 4400.0),
            item("c", "2026-10-30T10:00:00Z", min = 55, kg = 3000.0),
        )
        assertEquals("Esta semana: 3 entrenamientos · 2 h 40 min · 12.400 kg", weekSummaryText(items))
    }

    @Test fun resumenSemanalSingularMinutosYSinDuracion() {
        assertEquals("Esta semana: 1 entrenamiento · 45 min · 100 kg", weekSummaryText(listOf(item("a", "2026-10-30T10:00:00Z", min = 45))))
        assertEquals("Esta semana: 1 entrenamiento · 2 h · 100 kg", weekSummaryText(listOf(item("a", "2026-10-30T10:00:00Z", min = 120))))
        assertEquals("Esta semana: 1 entrenamiento · 100 kg", weekSummaryText(listOf(item("a", "2026-10-30T10:00:00Z", min = null))))
    }

    @Test fun resumenSemanalSinEntrenamientos() {
        assertEquals("Esta semana todavía no entrenaste", weekSummaryText(emptyList()))
    }

    @Test fun porDefectoEstaSemanaSiHaySesionesEstaSemanaYSiNoTodos() {
        assertEquals(HistoryFilter.WEEK, defaultFilter(listOf(item("a", "2026-10-29T00:00:00Z"), item("b", "2026-01-01T00:00:00Z")), week.first, week.second))
        assertEquals(HistoryFilter.ALL, defaultFilter(listOf(item("b", "2026-01-01T00:00:00Z")), week.first, week.second))
    }
}
