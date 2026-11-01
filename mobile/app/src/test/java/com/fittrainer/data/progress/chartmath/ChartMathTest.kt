package com.fittrainer.data.progress.chartmath

import com.fittrainer.data.db.progress.ProgressBodyPointEntity
import com.fittrainer.data.db.progress.ProgressExerciseMetaEntity
import com.fittrainer.data.db.progress.ProgressExercisePointEntity
import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ChartPoint
import com.fittrainer.data.progress.ChartRange
import com.fittrainer.data.progress.Record
import com.fittrainer.data.progress.availableFields
import com.fittrainer.data.progress.availableMetrics
import com.fittrainer.data.progress.delta
import com.fittrainer.data.progress.inRange
import com.fittrainer.data.progress.initialMetric
import com.fittrainer.data.progress.record
import com.fittrainer.data.progress.series
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ChartMathTest {
    private val today = LocalDate.parse("2026-10-31")

    private fun pt(date: String, max: Double? = null, e1rm: Double? = null, reps: Int = 5) =
        ProgressExercisePointEntity("o", "e", date, max, e1rm, 3, reps)

    private fun cp(date: String, v: Double) = ChartPoint(LocalDate.parse(date), v)

    private fun meta(default: String = "e1rm_kg") = ProgressExerciseMetaEntity(
        "o", "e", default, 100.0, "2026-09-01", 120.5, "2026-09-02", 0L,
    )

    private fun body(at: Long = 0L, weight: Double? = null, waist: Double? = null) =
        ProgressBodyPointEntity("id$at", "o", at, weight, null, null, waist, null, null, null)

    @Test
    fun unPuntoDeHace30DiasEntraEn1M() {
        val s = listOf(cp("2026-10-01", 1.0))
        assertEquals(s, inRange(s, ChartRange.M1, today))
    }

    @Test
    fun unoDeHace31NoEntra() {
        val s = listOf(cp("2026-09-30", 1.0))
        assertEquals(emptyList<ChartPoint>(), inRange(s, ChartRange.M1, today))
    }

    @Test
    fun todoNoFiltra() {
        val s = listOf(cp("2020-01-01", 1.0), cp("2026-10-31", 2.0))
        assertEquals(s, inRange(s, ChartRange.ALL, today))
    }

    @Test
    fun deltaConCeroYUnPuntoEsNulo() {
        assertNull(delta(emptyList()))
        assertNull(delta(listOf(cp("2026-10-01", 5.0))))
    }

    @Test
    fun deltaEsUltimoMenosPrimero() {
        val s = listOf(cp("2026-10-01", 100.0), cp("2026-10-02", 95.0), cp("2026-10-03", 112.5))
        assertEquals(12.5, delta(s)!!, 0.0001)
    }

    @Test
    fun ejercicioConKgPeroSin1rmSoloOfreceKgMax() {
        val pts = listOf(pt("2026-10-01", max = 50.0), pt("2026-10-02", max = 60.0, e1rm = 0.0))
        assertEquals(listOf(ChartMetric.MAX_KG), availableMetrics(pts))
    }

    @Test
    fun conAmbasOfreceE1rmYKgMax() {
        val pts = listOf(pt("2026-10-01", max = 50.0, e1rm = 60.0))
        assertEquals(listOf(ChartMetric.E1RM, ChartMetric.MAX_KG), availableMetrics(pts))
    }

    @Test
    fun pesoCorporalSoloOfreceReps() {
        val pts = listOf(pt("2026-10-01", max = 0.0), pt("2026-10-02", max = null))
        assertEquals(listOf(ChartMetric.REPS), availableMetrics(pts))
    }

    @Test
    fun metricaInicialRespetaLaDelBackendSiEstaDisponible() {
        val av = listOf(ChartMetric.E1RM, ChartMetric.MAX_KG)
        assertEquals(ChartMetric.MAX_KG, initialMetric("max_kg", av))
    }

    @Test
    fun siNoEstaUsaLaPrimera() {
        assertEquals(ChartMetric.MAX_KG, initialMetric("e1rm_kg", listOf(ChartMetric.MAX_KG)))
        assertEquals(ChartMetric.REPS, initialMetric(null, listOf(ChartMetric.REPS)))
    }

    @Test
    fun seriesSalteaDiasSinValor() {
        val pts = listOf(
            pt("2026-10-01", e1rm = 100.0),
            pt("2026-10-02", e1rm = null),
            pt("2026-10-03", e1rm = 0.0),
            pt("2026-10-04", e1rm = 110.0),
        )
        assertEquals(listOf(cp("2026-10-01", 100.0), cp("2026-10-04", 110.0)), series(pts, ChartMetric.E1RM))
    }

    @Test
    fun seriesDeRepsUsaLasRepeticiones() {
        val pts = listOf(pt("2026-10-01", reps = 12), pt("2026-10-02", reps = 15))
        assertEquals(listOf(cp("2026-10-01", 12.0), cp("2026-10-02", 15.0)), series(pts, ChartMetric.REPS))
    }

    @Test
    fun recordDeRepsEsElDiaConMasRepsSumadas() {
        val pts = listOf(pt("2026-10-01", reps = 20), pt("2026-10-02", reps = 30), pt("2026-10-03", reps = 30))
        assertEquals(Record(30.0, LocalDate.parse("2026-10-02")), record(null, pts, ChartMetric.REPS))
    }

    @Test
    fun recordDe1rmSaleDelBackend() {
        assertEquals(Record(120.5, LocalDate.parse("2026-09-02")), record(meta(), emptyList(), ChartMetric.E1RM))
        assertEquals(Record(100.0, LocalDate.parse("2026-09-01")), record(meta(), emptyList(), ChartMetric.MAX_KG))
    }

    @Test
    fun recordSinMetaONuloEsNulo() {
        assertNull(record(null, emptyList(), ChartMetric.E1RM))
        assertNull(record(meta().copy(prE1rmKg = null), emptyList(), ChartMetric.E1RM))
        assertNull(record(null, emptyList(), ChartMetric.REPS))
    }

    @Test
    fun camposDeMedidasSoloLosCargadosEnOrdenSinCintura() {
        val pts = listOf(body(1, waist = 80.0), body(2, weight = 70.0))
        assertEquals(listOf(BodyField.WEIGHT), availableFields(pts))
    }
}
