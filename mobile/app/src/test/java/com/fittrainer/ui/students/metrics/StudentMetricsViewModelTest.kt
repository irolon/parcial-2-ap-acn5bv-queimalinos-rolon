package com.fittrainer.ui.students.metrics

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.students.metrics.StudentMetricsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeMetricsApi
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import com.fittrainer.testing.fakes.students.FakeTrainerStudentMetricsDao
import com.fittrainer.testing.fakes.students.metricDto
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StudentMetricsViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val clock = Clock.fixed(Instant.parse("2026-11-01T15:00:00Z"), ZoneOffset.UTC)
    private val api = FakeMetricsApi().apply { server["m1"] = metricDto("m1") }
    private val connectivity = FakeConnectivityObserver()
    private val detailApi = FakeStudentDetailApi()
    private val detailRepo = TrainerStudentDetailRepository(detailApi, FakeTrainerStudentDetailDao(), clock)

    private fun vm(openNew: Boolean = false) = StudentMetricsViewModel(
        StudentMetricsRepository(api, FakeTrainerStudentMetricsDao(), clock), detailRepo, FakeTrainerSession(), connectivity, clock,
        SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1", OPEN_NEW_ARG to openNew)),
    )

    private fun TestScope.started(vm: StudentMetricsViewModel) {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
    }

    @Test fun `guardar agrega la medida, cierra la hoja y refresca la ficha`() = runTest {
        val vm = vm()
        started(vm)
        vm.onOpenNew()
        vm.onFormChange { it.copy(weight = "80,5", waist = "82") }
        vm.onSave()
        advanceUntilIdle()
        assertNull(vm.uiState.value.sheet)
        assertEquals(METRIC_SAVED, vm.uiState.value.notice)
        assertEquals(2, vm.uiState.value.metrics.size)
        assertEquals(80.5, api.posts.single().weightKg!!, 0.0)
        // La ficha se refrescó: la "Última medición" ya está en Room.
        assertNotNull(detailRepo.observe("t1", "s1").first())
    }

    @Test fun `doble toque en Guardar manda un solo POST`() = runTest {
        val vm = vm()
        started(vm)
        vm.onOpenNew()
        vm.onFormChange { it.copy(weight = "80") }
        api.postGate = CompletableDeferred()
        vm.onSave()
        advanceUntilIdle()
        vm.onSave()
        advanceUntilIdle()
        api.postGate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, api.posts.size)
    }

    @Test fun `tras un error incierto el formulario se bloquea y reintentar manda exactamente lo mismo`() = runTest {
        val vm = vm()
        started(vm)
        vm.onOpenNew()
        vm.onFormChange { it.copy(weight = "80") }
        api.error = java.io.IOException("corte")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(METRIC_SAVE_FAILED, vm.uiState.value.sheet!!.notice)
        // Corregir a 81 no se puede: el intento anterior pudo haberse guardado con 80.
        vm.onFormChange { it.copy(weight = "81") }
        assertEquals("80", vm.uiState.value.sheet!!.form.weight)
        api.error = null
        vm.onSave()
        advanceUntilIdle()
        assertEquals(api.posts[0], api.posts[1])
        assertNull(vm.uiState.value.sheet)
    }

    @Test fun `un 400 no bloquea y se puede corregir`() = runTest {
        val vm = vm()
        started(vm)
        vm.onOpenNew()
        vm.onFormChange { it.copy(weight = "80") }
        api.error = com.fittrainer.testing.fakes.auth.apiError(400, "VALIDATION_ERROR")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(METRIC_REJECTED, vm.uiState.value.sheet!!.notice)
        vm.onFormChange { it.copy(weight = "81") }
        assertEquals("81", vm.uiState.value.sheet!!.form.weight)
    }

    @Test fun `un 4xx despues de un intento incierto no desbloquea el formulario`() = runTest {
        val vm = vm()
        started(vm)
        vm.onOpenNew()
        vm.onFormChange { it.copy(weight = "80") }
        api.error = java.io.IOException("corte")
        vm.onSave()
        advanceUntilIdle()
        api.error = com.fittrainer.testing.fakes.auth.apiError(401, "UNAUTHORIZED")
        vm.onSave()
        advanceUntilIdle()
        assertNotNull(vm.uiState.value.sheet!!.pending)
        assertEquals(METRIC_SAVE_FAILED, vm.uiState.value.sheet!!.notice)
        vm.onFormChange { it.copy(weight = "81") }
        assertEquals("80", vm.uiState.value.sheet!!.form.weight)
        api.error = null
        vm.onSave()
        advanceUntilIdle()
        assertEquals(api.posts[0], api.posts[2])
    }

    @Test fun `cerrar con un intento incierto rebaja el historial`() = runTest {
        val vm = vm()
        started(vm)
        vm.onOpenNew()
        vm.onFormChange { it.copy(weight = "80") }
        api.error = java.io.IOException("corte")
        vm.onSave()
        advanceUntilIdle()
        api.error = null
        val before = api.listCalls
        vm.onCloseSheet()
        advanceUntilIdle()
        assertEquals(before + 1, api.listCalls)
    }

    @Test fun `sin red no se abre la hoja ni se borra`() = runTest {
        val vm = vm()
        started(vm)
        connectivity.state.value = false
        advanceUntilIdle()
        vm.onOpenNew()
        assertNull(vm.uiState.value.sheet)
        vm.onAskDelete(vm.uiState.value.metrics.single())
        assertNull(vm.uiState.value.confirmDelete)
        assertFalse(vm.uiState.value.canWrite)
    }

    @Test fun `borrar pide confirmacion y despues la saca`() = runTest {
        val vm = vm()
        started(vm)
        vm.onAskDelete(vm.uiState.value.metrics.single())
        assertNotNull(vm.uiState.value.confirmDelete)
        assertEquals(1, api.server.size)
        vm.onConfirmDelete()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.metrics.isEmpty())
        assertEquals(METRIC_DELETED, vm.uiState.value.notice)
    }

    @Test fun `entrar con new=true abre la hoja`() = runTest {
        val vm = vm(openNew = true)
        started(vm)
        assertNotNull(vm.uiState.value.sheet)
    }
}
