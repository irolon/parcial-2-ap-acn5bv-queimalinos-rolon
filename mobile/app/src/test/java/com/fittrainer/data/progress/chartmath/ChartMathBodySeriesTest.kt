package com.fittrainer.data.progress.chartmath

import com.fittrainer.data.db.progress.ProgressBodyPointEntity
import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartPoint
import com.fittrainer.data.progress.ChartRange
import com.fittrainer.data.progress.bodySeries
import com.fittrainer.data.progress.delta
import com.fittrainer.data.progress.inRange
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class ChartMathBodySeriesTest {
    private val today = LocalDate.parse("2026-10-31")

    private fun cp(date: String, v: Double) = LocalDate.parse(date) to v

    private fun dv(s: List<ChartPoint>) = s.map { it.date to it.value }

    private fun body(at: Long = 0L, weight: Double? = null) =
        ProgressBodyPointEntity("id$at", "o", at, weight, null, null, null, null, null, null)

    @Test
    fun bodySeriesUsaLaFechaLocal() {
        val at = Instant.parse("2026-10-31T01:00:00Z").toEpochMilli()
        val zone = ZoneId.of("America/Argentina/Buenos_Aires")
        val s = bodySeries(listOf(body(at, weight = 70.0), body(at + 1, weight = null)), BodyField.WEIGHT, zone)
        assertEquals(listOf(cp("2026-10-30", 70.0)), dv(s))
    }

    private fun at(iso: String) = Instant.parse(iso).toEpochMilli()

    @Test
    fun dosMedidasDelMismoDiaSonDosPuntosConXDistintoYOrdenado() {
        val zone = ZoneId.of("UTC")
        val pts = listOf(
            body(at("2026-10-30T17:00:00Z"), weight = 79.0),
            body(at("2026-10-30T09:00:00Z"), weight = 80.0),
        )
        val s = bodySeries(pts, BodyField.WEIGHT, zone)
        assertEquals(listOf(80.0, 79.0), s.map { it.value })
        assertEquals(listOf(LocalDate.parse("2026-10-30"), LocalDate.parse("2026-10-30")), s.map { it.date })
        assert(s[0].x < s[1].x)
        assertEquals(LocalDate.parse("2026-10-30").toEpochDay() + 9.0 / 24, s[0].x, 1e-9)
    }

    @Test
    fun elDeltaDeDosMedidasDelMismoDiaEsUltimaMenosPrimera() {
        val zone = ZoneId.of("UTC")
        val a = at("2026-10-30T09:00:00Z")
        val s = bodySeries(listOf(body(a, weight = 80.0), body(a + 3_600_000, weight = 79.0)), BodyField.WEIGHT, zone)
        assertEquals(-1.0, delta(s)!!, 0.0001)
        assertEquals(79.0, s.last().value, 0.0)
    }

    @Test
    fun empateDeRecordedAtDesempataPorId() {
        val zone = ZoneId.of("UTC")
        val t = at("2026-10-30T09:00:00Z")
        val a = ProgressBodyPointEntity("b", "o", t, 79.0, null, null, null, null, null, null)
        val b = ProgressBodyPointEntity("a", "o", t, 80.0, null, null, null, null, null, null)
        assertEquals(listOf(80.0, 79.0), bodySeries(listOf(a, b), BodyField.WEIGHT, zone).map { it.value })
    }

    private fun withId(id: String, t: Long, w: Double) =
        ProgressBodyPointEntity(id, "o", t, w, null, null, null, null, null, null)

    @Test
    fun dosMedicionesConElMismoRecordedAtSonDosPuntosDistintos() {
        val t = at("2026-10-30T09:00:00Z")
        val s = bodySeries(listOf(withId("b", t, 79.0), withId("a", t, 80.0)), BodyField.WEIGHT, ZoneId.of("UTC"))
        assertEquals(listOf(80.0, 79.0), s.map { it.value })
        assert(s[0].x < s[1].x)
        assertEquals(setOf(xUnitsOf(s[0]), xUnitsOf(s[1])).size, 2)
        assertEquals(-1.0, delta(s)!!, 0.0001)
        assertEquals(s[0].date, s[1].date)
    }

    @Test
    fun tresMedicionesConElMismoRecordedAtTienenXCrecienteYUnicoTrasElRedondeo() {
        val t = at("2026-10-30T09:00:00Z")
        val pts = listOf(withId("c", t, 78.0), withId("a", t, 80.0), withId("b", t, 79.0))
        val s = bodySeries(pts, BodyField.WEIGHT, ZoneId.of("UTC"))
        assertEquals(listOf(80.0, 79.0, 78.0), s.map { it.value })
        assert(s[0].x < s[1].x && s[1].x < s[2].x)
        assertEquals(3, s.map { xUnitsOf(it) }.toSet().size)
    }

    @Test
    fun elEmpujeNoPisaAUnaMedicionPosteriorCercana() {
        val t = at("2026-10-30T09:00:00Z")
        val pts = listOf(withId("a", t, 80.0), withId("b", t, 79.0), withId("c", t + 500, 78.0))
        val s = bodySeries(pts, BodyField.WEIGHT, ZoneId.of("UTC"))
        assertEquals(listOf(80.0, 79.0, 78.0), s.map { it.value })
        assertEquals(3, s.map { xUnitsOf(it) }.toSet().size)
        assert(s[0].x < s[1].x && s[1].x < s[2].x)
    }

    private fun xUnitsOf(p: ChartPoint) = com.fittrainer.ui.progress.charts.components.xUnits(p.x)

    @Test
    fun elPeriodoSeFiltraPorFechaLocalYConservaLasDosDelDia() {
        val zone = ZoneId.of("UTC")
        val edge = at("2026-10-01T05:00:00Z")
        val s = bodySeries(
            listOf(body(at("2026-09-30T23:00:00Z"), weight = 90.0), body(edge, weight = 80.0), body(edge + 1, weight = 79.0)),
            BodyField.WEIGHT, zone,
        )
        val shown = inRange(s, ChartRange.M1, today)
        assertEquals(listOf(80.0, 79.0), shown.map { it.value })
        assertEquals(-1.0, delta(shown)!!, 0.0001)
    }

    @Test
    fun diasDistintosNoSeTocan() {
        val zone = ZoneId.of("UTC")
        val a = Instant.parse("2026-10-29T09:00:00Z").toEpochMilli()
        val b = Instant.parse("2026-10-30T09:00:00Z").toEpochMilli()
        val s = bodySeries(listOf(body(a, weight = 80.0), body(b, weight = 79.0)), BodyField.WEIGHT, zone)
        assertEquals(listOf(cp("2026-10-29", 80.0), cp("2026-10-30", 79.0)), dv(s))
    }

    @Test
    fun cadaMedicionTomaSuFechaLocalDeLaZona() {
        val zone = ZoneId.of("America/Argentina/Buenos_Aires")
        // 01:00Z y 04:00Z del 31 son 22:00 y 01:00 locales: dos días distintos en Buenos Aires.
        val late = Instant.parse("2026-10-31T01:00:00Z").toEpochMilli()
        val next = Instant.parse("2026-10-31T04:00:00Z").toEpochMilli()
        val s = bodySeries(listOf(body(late, weight = 70.0), body(next, weight = 71.0)), BodyField.WEIGHT, zone)
        assertEquals(listOf(cp("2026-10-30", 70.0), cp("2026-10-31", 71.0)), dv(s))
    }
}
