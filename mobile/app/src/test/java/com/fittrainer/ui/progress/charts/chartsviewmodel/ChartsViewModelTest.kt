package com.fittrainer.ui.progress.charts.chartsviewmodel

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.api.progress.BodyPointDto
import com.fittrainer.data.api.progress.BodyProgressDto
import com.fittrainer.data.api.progress.ExercisePointDto
import com.fittrainer.data.api.progress.ExerciseProgressDto
import com.fittrainer.data.api.progress.ExerciseRefDto
import com.fittrainer.data.api.progress.OverviewExerciseDto
import com.fittrainer.data.api.progress.PrDto
import com.fittrainer.data.api.progress.PrValueDto
import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ChartRange
import com.fittrainer.data.progress.ProgressRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.progress.FakeProgressApi
import com.fittrainer.testing.fakes.progress.FakeProgressDao
import com.fittrainer.testing.fakes.progress.httpErrorWithCode
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.ui.progress.charts.ChartsView
import com.fittrainer.ui.progress.charts.ChartsViewModel
import java.time.Instant
import java.time.LocalDate
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ChartsViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeProgressApi()
    private val dao = FakeProgressDao()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val session = FakeStudentSession()
    private val clock = MutableClock(Instant.parse("2026-10-31T12:00:00Z").toEpochMilli())
    private val repository = ProgressRepository(api, dao, { session }, clock)

    private fun vm(saved: Map<String, Any?> = emptyMap()) =
        ChartsViewModel(repository, session, connectivity, clock, SavedStateHandle(saved))

    private fun exercise(id: String, vararg dates: String, default: String = "e1rm_kg") = ExerciseProgressDto(
        exercise = ExerciseRefDto(id, id),
        points = dates.mapIndexed { i, d -> ExercisePointDto(d, maxKg = 50.0 + i, e1rmKg = 60.0 + i * 5, sets = 3, reps = 8) },
        pr = PrDto(e1rmKg = PrValueDto(70.0, dates.last())),
        defaultMetric = default,
    )

    private fun load() {
        // Lista ya bajada y fresca: estos tests miran el ejercicio; la lista tiene los suyos en ChartsViewModelListTest.
        dao.seedTrained("u1", TrainedExercise("e1", "Sentadilla", 3, "2026-10-30"), TrainedExercise("e2", "Press", 1, "2026-10-01"), fetchedAt = clock.millis)
        api.trained = listOf(OverviewExerciseDto("e1", "Sentadilla", 3, "2026-10-30"), OverviewExerciseDto("e2", "Press", 1, "2026-10-01"))
        api.exercises = mapOf(
            "e1" to exercise("e1", "2026-07-01", "2026-09-15", "2026-10-30"),
            "e2" to exercise("e2", "2026-10-01", default = "e1rm_kg"),
        )
    }

    private fun TestScope.started(model: ChartsViewModel): ChartsViewModel {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { model.uiState.collect {} }
        model.onStart()
        advanceUntilIdle()
        return model
    }

    @Test fun arrancaEnCargasConElUltimoEjercicioEntrenadoYTresMeses() = runTest {
        load()
        val s = started(vm()).uiState.value
        assertEquals(ChartsView.LOADS, s.view)
        assertEquals("e1", s.selectedExerciseId)
        assertEquals(ChartRange.M3, s.range)
        assertEquals(ChartMetric.E1RM, s.metric)
        // El punto de julio queda fuera de los 90 días.
        assertEquals(listOf(LocalDate.parse("2026-09-15"), LocalDate.parse("2026-10-30")), s.exerciseSeries.map { it.date })
        assertEquals(3, s.totalExerciseDays)
        assertTrue(s.exerciseEverLoaded)
        assertEquals(5.0, s.exerciseDelta!!, 0.0)
        assertEquals(70.0, s.record!!.value, 0.0)
    }

    @Test fun cambiarElPeriodoFiltraSinPedirDeNuevo() = runTest {
        load()
        val model = started(vm())
        model.onRangeSelected(ChartRange.ALL)
        advanceUntilIdle()
        assertEquals(3, model.uiState.value.exerciseSeries.size)
        model.onRangeSelected(ChartRange.M1)
        advanceUntilIdle()
        assertEquals(1, model.uiState.value.exerciseSeries.size)
        assertEquals(1, api.exerciseCalls)
    }

    @Test fun elPeriodoEsElMismoEnMedidas() = runTest {
        load()
        api.body = BodyProgressDto(
            listOf(
                BodyPointDto("b1", "2026-06-01T10:00:00Z", weightKg = 80.0),
                BodyPointDto("b2", "2026-10-20T10:00:00Z", weightKg = 78.0),
            ),
        )
        val model = started(vm())
        model.onRangeSelected(ChartRange.M1)
        model.onViewSelected(ChartsView.BODY)
        advanceUntilIdle()
        val s = model.uiState.value
        assertEquals(ChartsView.BODY, s.view)
        assertEquals(ChartRange.M1, s.range)
        assertEquals(1, s.bodySeries.size)
        assertEquals(78.0, s.bodyLast!!.value, 0.0)
        assertNull(s.bodyDelta)
        assertTrue(s.bodyEverLoaded)
        assertEquals(1, api.bodyCalls)
    }

    @Test fun cambiarDeEjercicioReiniciaLaMetrica() = runTest {
        load()
        val model = started(vm())
        model.onMetricSelected(ChartMetric.MAX_KG)
        advanceUntilIdle()
        assertEquals(ChartMetric.MAX_KG, model.uiState.value.metric)
        model.onExerciseSelected("e2")
        advanceUntilIdle()
        assertEquals("e2", model.uiState.value.selectedExerciseId)
        assertEquals(ChartMetric.E1RM, model.uiState.value.metric) // vuelve al default de e2 (distinto del elegido)
        model.onExerciseSelected("e1")
        advanceUntilIdle()
        assertEquals(ChartMetric.E1RM, model.uiState.value.metric)
    }

    @Test fun si404PasaAlSiguienteEjercicio() = runTest {
        load()
        api.exerciseErrors = mapOf("e1" to httpErrorWithCode(404, "EXERCISE_NOT_FOUND"))
        val s = started(vm()).uiState.value
        assertEquals(listOf("e2"), s.exercises.map { it.exerciseId })
        assertEquals("e2", s.selectedExerciseId)
        assertFalse(s.refreshFailed)
        assertTrue(s.exerciseEverLoaded)
    }

    @Test fun sinRedMuestraLoGuardadoYMarcaOffline() = runTest {
        load()
        connectivity.state.value = false
        api.error = java.io.IOException("sin red")
        val s = started(vm()).uiState.value
        assertTrue(s.isOffline)
        assertFalse(s.refreshFailed)
        assertFalse(s.exerciseEverLoaded)
        assertEquals("e1", s.selectedExerciseId)
    }

    @Test fun errorDeRefrescoMarcaRefreshFailedYReintentarFuerza() = runTest {
        load()
        val model = started(vm())
        api.error = httpError(503)
        model.onRetry()
        advanceUntilIdle()
        assertEquals(2, api.exerciseCalls) // force: el caché estaba fresco y igual pidió
        assertTrue(model.uiState.value.refreshFailed)
        assertFalse(model.uiState.value.isRefreshing)
        assertEquals(3, model.uiState.value.totalExerciseDays) // lo guardado sigue ahí
        api.error = null
        model.onRetry()
        advanceUntilIdle()
        assertFalse(model.uiState.value.refreshFailed)
    }

    @Test fun restauraElEstadoDesdeSavedStateHandle() = runTest {
        load()
        val s = started(vm(mapOf("range" to "M6", "exerciseId" to "e2"))).uiState.value
        assertEquals(ChartRange.M6, s.range)
        assertEquals("e2", s.selectedExerciseId)
        assertEquals(ChartMetric.E1RM, s.metric)
    }
}
