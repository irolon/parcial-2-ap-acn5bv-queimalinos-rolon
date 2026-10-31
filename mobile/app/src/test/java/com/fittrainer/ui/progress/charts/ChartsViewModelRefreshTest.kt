package com.fittrainer.ui.progress.charts

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.api.progress.ExercisePointDto
import com.fittrainer.data.api.progress.ExerciseProgressDto
import com.fittrainer.data.api.progress.ExerciseRefDto
import com.fittrainer.data.api.progress.PrDto
import com.fittrainer.data.api.progress.PrValueDto
import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ProgressRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.progress.FakeProgressApi
import com.fittrainer.testing.fakes.progress.FakeProgressDao
import com.fittrainer.testing.fakes.progress.httpErrorWithCode
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.httpError
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.time.Instant

/** Refrescos por vista y por clave, y reinicio de la métrica al cambiar el ejercicio efectivo. */
@OptIn(ExperimentalCoroutinesApi::class)
class ChartsViewModelRefreshTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeProgressApi()
    private val dao = FakeProgressDao()
    private val session = FakeStudentSession()
    private val clock = MutableClock(Instant.parse("2026-10-31T12:00:00Z").toEpochMilli())
    private val repository = ProgressRepository(api, dao, { session }, clock)

    private fun vm(saved: Map<String, Any?> = emptyMap()) =
        ChartsViewModel(repository, session, FakeConnectivityObserver(true), clock, SavedStateHandle(saved))

    private fun exercise(id: String, default: String) = ExerciseProgressDto(
        exercise = ExerciseRefDto(id, id),
        points = listOf(ExercisePointDto("2026-10-01", maxKg = 50.0, e1rmKg = 60.0, sets = 3, reps = 8)),
        pr = PrDto(e1rmKg = PrValueDto(60.0, "2026-10-01")),
        defaultMetric = default,
    )

    private fun load() {
        dao.trained.value = mapOf("u1" to listOf(TrainedExercise("e1", "Sentadilla", 2), TrainedExercise("e2", "Press", 1)))
        api.exercises = mapOf("e1" to exercise("e1", "e1rm_kg"), "e2" to exercise("e2", "e1rm_kg"))
    }

    private fun TestScope.started(model: ChartsViewModel): ChartsViewModel {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { model.uiState.collect {} }
        model.onStart()
        advanceUntilIdle()
        return model
    }

    @Test fun pasarAMedidasRefrescaLasMedidas() = runTest {
        load()
        val model = started(vm())
        assertEquals(0, api.bodyCalls)
        model.onViewSelected(ChartsView.BODY)
        advanceUntilIdle()
        assertEquals(1, api.bodyCalls)
        assertEquals(1, api.exerciseCalls)
        assertTrue(model.uiState.value.bodyEverLoaded)
    }

    @Test fun unErrorDeCargasNoApareceEnMedidasYReintentarAllaForzaMedidas() = runTest {
        load()
        api.exerciseErrors = mapOf("e1" to httpError(503))
        val model = started(vm())
        val exerciseCalls = api.exerciseCalls
        assertTrue(model.uiState.value.refreshFailed)
        model.onViewSelected(ChartsView.BODY)
        advanceUntilIdle()
        assertFalse(model.uiState.value.refreshFailed)
        api.error = httpError(503)
        model.onRetry()
        advanceUntilIdle()
        assertEquals(2, api.bodyCalls) // force sobre medidas, no sobre el ejercicio
        assertEquals(exerciseCalls, api.exerciseCalls)
        assertTrue(model.uiState.value.refreshFailed)
    }

    @Test fun volverLaRedRecargaLaVistaActual() = runTest {
        load()
        val connectivity = FakeConnectivityObserver(false)
        api.error = java.io.IOException("sin red")
        val model = started(ChartsViewModel(repository, session, connectivity, clock, SavedStateHandle()))
        assertEquals(ChartsContent.NEVER_LOADED, ChartsEmptyState.exercises(model.uiState.value))
        api.error = null
        connectivity.state.value = true
        advanceUntilIdle()
        assertTrue(model.uiState.value.exerciseEverLoaded)
        assertEquals(ChartsContent.ONE_POINT, ChartsEmptyState.exercises(model.uiState.value))
    }

    @Test fun entrenarDeNuevoElEjercicioVuelveAPedirloAunqueEsteFresco() = runTest {
        load()
        val model = started(vm())
        assertEquals(1, api.exerciseCalls)
        // Terminó una sesión: el historial guardado trae un startedAt más nuevo de e1.
        dao.trained.value = mapOf("u1" to listOf(TrainedExercise("e1", "Sentadilla", 50), TrainedExercise("e2", "Press", 1)))
        advanceUntilIdle()
        assertEquals(2, api.exerciseCalls)
        assertEquals("e1", model.uiState.value.selectedExerciseId)
    }

    /** Con red pero el backend no responde (IOException → Offline): falla con Reintentar, no un spinner eterno. */
    @Test fun servidorInalcanzableConRedEsFallaYSobreviveACerrarElBanner() = runTest {
        load()
        api.error = java.io.IOException("connection refused")
        val model = started(vm())
        assertTrue(model.uiState.value.refreshFailed)
        assertEquals(ChartsContent.LOAD_FAILED, ChartsEmptyState.exercises(model.uiState.value))
        model.dismissRefreshError()
        advanceUntilIdle()
        assertFalse(model.uiState.value.refreshFailed)
        assertEquals(ChartsContent.LOAD_FAILED, ChartsEmptyState.exercises(model.uiState.value))
        api.error = null
        model.onRetry()
        advanceUntilIdle()
        assertTrue(model.uiState.value.exerciseEverLoaded)
    }

    @Test fun el404ReiniciaLaMetricaAlDefaultDelSiguiente() = runTest {
        load()
        api.exerciseErrors = mapOf("e1" to httpErrorWithCode(404, "EXERCISE_NOT_FOUND"))
        api.exercises = mapOf("e2" to exercise("e2", "e1rm_kg"))
        val s = started(vm(mapOf("exerciseId" to "e1", "metric" to "MAX_KG"))).uiState.value
        assertEquals("e2", s.selectedExerciseId)
        assertEquals(ChartMetric.E1RM, s.metric)
    }

    @Test fun laMetricaRestauradaSobreviveALaRotacion() = runTest {
        load()
        val s = started(vm(mapOf("exerciseId" to "e2", "metric" to "MAX_KG"))).uiState.value
        assertEquals("e2", s.selectedExerciseId)
        assertEquals(ChartMetric.MAX_KG, s.metric)
    }

    @Test fun unEjercicioNuevoQueTraeElHistorialApareceEnElSelectorSinReabrirGraficos() = runTest {
        load()
        val model = started(vm())
        assertEquals(listOf("e1", "e2"), model.uiState.value.exercises.map { it.exerciseId })
        // El refresco del historial escribe en Room (el fake emite como la consulta de ejercicios entrenados).
        dao.trained.value = mapOf(
            "u1" to listOf(TrainedExercise("e3", "Remo", 9), TrainedExercise("e1", "Sentadilla", 2), TrainedExercise("e2", "Press", 1)),
        )
        advanceUntilIdle()
        assertEquals(listOf("e3", "e1", "e2"), model.uiState.value.exercises.map { it.exerciseId })
    }
}
