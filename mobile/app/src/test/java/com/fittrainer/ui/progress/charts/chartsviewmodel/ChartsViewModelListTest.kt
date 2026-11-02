package com.fittrainer.ui.progress.charts.chartsviewmodel

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.api.progress.ExercisePointDto
import com.fittrainer.data.api.progress.ExerciseProgressDto
import com.fittrainer.data.api.progress.ExerciseRefDto
import com.fittrainer.data.api.progress.OverviewExerciseDto
import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.ProgressRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.progress.FakeProgressApi
import com.fittrainer.testing.fakes.progress.FakeProgressDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.ui.progress.charts.ChartsContent
import com.fittrainer.ui.progress.charts.ChartsEmptyState
import com.fittrainer.ui.progress.charts.ChartsUiState
import com.fittrainer.ui.progress.charts.ChartsViewModel
import java.time.Instant
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

/** La lista del desplegable sale del overview: cuándo se pide y qué se ve mientras no se sabe si entrenó. */
@OptIn(ExperimentalCoroutinesApi::class)
class ChartsViewModelListTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeProgressApi()
    private val dao = FakeProgressDao()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val clock = MutableClock(Instant.parse("2026-10-31T12:00:00Z").toEpochMilli())
    private val repository = ProgressRepository(api, dao, { FakeStudentSession() }, clock)

    private fun vm(saved: Map<String, Any?> = emptyMap()) =
        ChartsViewModel(repository, FakeStudentSession(), connectivity, clock, SavedStateHandle(saved))

    private fun serverHas(vararg ids: String) {
        api.trained = ids.mapIndexed { i, id -> OverviewExerciseDto(id, "Ejercicio $id", 2, "2026-10-${30 - i}") }
        api.exercises = ids.associateWith { id ->
            ExerciseProgressDto(ExerciseRefDto(id, id), listOf(ExercisePointDto("2026-10-01", maxKg = 50.0, sets = 3, reps = 8)), defaultMetric = "max_kg")
        }
    }

    private fun TestScope.started(model: ChartsViewModel): ChartsViewModel {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { model.uiState.collect {} }
        model.onStart()
        advanceUntilIdle()
        return model
    }

    private fun content(s: ChartsUiState) = ChartsEmptyState.exercises(s)

    @Test fun abrirCargasBajaLaListaYDespuesElPrimerEjercicio() = runTest {
        serverHas("e1", "e2")
        val s = started(vm()).uiState.value
        assertEquals(1, api.overviewCalls)
        assertTrue(s.exercisesEverLoaded)
        assertEquals(listOf("e1", "e2"), s.exercises.map { it.exerciseId })
        assertEquals("e1", s.selectedExerciseId)
        assertTrue(s.exerciseEverLoaded)
    }

    /** Caso B de la revisión: sin bajar nunca la lista no se sabe si entrenó, así que nada de "Terminá tu primera sesión". */
    @Test fun listaNuncaBajadaSinRedEsConectateNoTermináTuPrimeraSesion() = runTest {
        connectivity.state.value = false
        api.error = java.io.IOException("sin red")
        val s = started(vm()).uiState.value
        assertFalse(s.exercisesEverLoaded)
        assertEquals(ChartsContent.NEVER_LOADED, content(s))
    }

    @Test fun listaNuncaBajadaConFallaEsUnSoloAvisoConReintentar() = runTest {
        serverHas("e1")
        api.error = httpError(503)
        val model = started(vm())
        assertEquals(ChartsContent.LOAD_FAILED, content(model.uiState.value))
        assertFalse(model.uiState.value.refreshFailed) // sin banner encima de la sección
        api.error = null
        model.onRetry()
        advanceUntilIdle()
        assertEquals(ChartsContent.ONE_POINT, content(model.uiState.value))
    }

    @Test fun listaBajadaYVaciaRecienAhiEsNoExercises() = runTest {
        val s = started(vm()).uiState.value
        assertTrue(s.exercisesEverLoaded)
        assertEquals(ChartsContent.NO_EXERCISES, content(s))
    }

    @Test fun listaFrescaNoSePideYReintentarLaFuerza() = runTest {
        serverHas("e1")
        dao.seedTrained("u1", TrainedExercise("e1", "Ejercicio e1", 2, "2026-10-30"), fetchedAt = clock.millis)
        val model = started(vm())
        assertEquals(0, api.overviewCalls)
        model.onRetry()
        advanceUntilIdle()
        assertEquals(1, api.overviewCalls)
    }

    @Test fun conLoGuardadoUnaFallaDeLaListaMuestraElBanner() = runTest {
        serverHas("e1")
        val model = started(vm())
        api.error = httpError(503)
        model.onRetry()
        advanceUntilIdle()
        assertTrue(model.uiState.value.refreshFailed)
        model.dismissRefreshError()
        advanceUntilIdle()
        assertFalse(model.uiState.value.refreshFailed)
        assertEquals(ChartsContent.ONE_POINT, content(model.uiState.value))
    }

    @Test fun enMedidasNoSePideLaLista() = runTest {
        started(vm(mapOf("view" to "BODY")))
        assertEquals(0, api.overviewCalls)
        assertEquals(1, api.bodyCalls)
    }

    @Test fun volverLaRedBajaLaListaNuncaBajada() = runTest {
        serverHas("e1")
        connectivity.state.value = false
        api.error = java.io.IOException("sin red")
        val model = started(vm())
        api.error = null
        connectivity.state.value = true
        advanceUntilIdle()
        assertEquals(listOf("e1"), model.uiState.value.exercises.map { it.exerciseId })
        assertTrue(model.uiState.value.exerciseEverLoaded)
    }
}
