package com.fittrainer.ui.progress.charts

import com.fittrainer.data.db.progress.ProgressExerciseMetaEntity
import com.fittrainer.data.db.progress.ProgressExercisePointEntity
import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.BodyChart
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ChartRange
import com.fittrainer.data.progress.ExerciseChart
import java.time.LocalDate
import java.time.ZoneOffset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** La armada del estado (buildChartsState): días vs puntos, gráfico de otro ejercicio y lista sin cargar. */
class ChartsStateMapperTest {
    private val today = LocalDate.of(2026, 10, 31)
    private val exercises = listOf(TrainedExercise("e1", "Sentadilla", 2), TrainedExercise("e2", "Press", 1))
    private val prefs = ChartsPrefs(ChartsView.LOADS, ChartMetric.E1RM, ChartRange.ALL, null)

    private fun meta(id: String) = ProgressExerciseMetaEntity("u1", id, "e1rm_kg", null, null, 70.0, "2026-10-01", 1L)
    private fun point(id: String, date: String, e1rm: Double?) = ProgressExercisePointEntity("u1", id, date, 50.0, e1rm, 3, 8)

    private fun state(list: List<TrainedExercise>?, selected: String?, chart: ExerciseChart?) =
        buildChartsState(ChartsData(list, selected, chart, BodyChart(emptyList(), null)), prefs, false, RefreshFlags(), today, ZoneOffset.UTC)

    @Test fun losDiasSeCuentanPorPuntosGuardadosNoPorLaMetrica() {
        // Tres días entrenados; el 1RM solo existe en uno (los otros sin peso válido para estimarlo).
        val chart = ExerciseChart(
            "e1",
            listOf(point("e1", "2026-10-01", 70.0), point("e1", "2026-10-10", null), point("e1", "2026-10-20", null)),
            meta("e1"),
        )
        val s = state(exercises, "e1", chart)
        assertEquals(3, s.totalExerciseDays)
        assertEquals(1, s.exerciseSeries.size)
        assertEquals(ChartsContent.CHART, ChartsEmptyState.exercises(s))
    }

    @Test fun unSoloDiaEsOnePoint() {
        val s = state(exercises, "e1", ExerciseChart("e1", listOf(point("e1", "2026-10-01", 70.0)), meta("e1")))
        assertEquals(ChartsContent.ONE_POINT, ChartsEmptyState.exercises(s))
    }

    @Test fun elGraficoDeOtroEjercicioNoSeMuestra() {
        // Recién se eligió e2 y Room todavía no emitió su gráfico: el de e1 no se dibuja con el nombre de e2.
        val stale = ExerciseChart("e1", listOf(point("e1", "2026-10-01", 70.0), point("e1", "2026-10-10", 75.0)), meta("e1"))
        val s = state(exercises, "e2", stale)
        assertEquals("e2", s.selectedExerciseId)
        assertEquals(0, s.totalExerciseDays)
        assertTrue(s.exerciseSeries.isEmpty())
        assertFalse(s.exerciseEverLoaded)
    }

    @Test fun listaTodaviaSinCargarEsCarga() {
        val s = state(null, null, null)
        assertFalse(s.exercisesLoaded)
        assertEquals(ChartsContent.LOADING, ChartsEmptyState.exercises(s))
        assertTrue(state(emptyList(), null, null).exercisesLoaded)
    }
}
