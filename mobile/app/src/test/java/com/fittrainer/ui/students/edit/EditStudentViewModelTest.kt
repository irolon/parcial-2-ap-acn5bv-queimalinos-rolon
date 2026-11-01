package com.fittrainer.ui.students.edit

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.students.detail.EditField
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class EditStudentViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val clock = Clock.fixed(Instant.parse("2026-11-01T15:00:00Z"), ZoneOffset.UTC)
    private val api = FakeStudentDetailApi()
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerStudentDetailRepository(api, FakeTrainerStudentDetailDao(), clock)

    private suspend fun TestScope.loaded(): EditStudentViewModel {
        repo.refresh("t1", "s1")
        val vm = EditStudentViewModel(repo, FakeTrainerSession(), connectivity, clock, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1")))
        advanceUntilIdle()
        return vm
    }

    @Test fun `sin cambios Guardar queda deshabilitado`() = runTest {
        val vm = loaded()
        assertFalse(vm.state.value.canSave)
    }

    @Test fun `cambiar lesiones guarda solo eso y vuelve`() = runTest {
        val vm = loaded()
        vm.onChange({ it.copy(injuries = "Rodilla derecha") }, EditField.INJURIES)
        assertTrue(vm.state.value.canSave)
        vm.onSave()
        advanceUntilIdle()
        assertEquals("""{"injuries":"Rodilla derecha"}""", api.patches.single().toString())
        assertTrue(vm.state.value.saved)
    }

    @Test fun `un 400 se muestra en su campo`() = runTest {
        val vm = loaded()
        api.error = httpError(400, """{"error":{"code":"VALIDATION_ERROR","message":"x","details":[{"field":"injuries","message":"Muy largo"}]}}""")
        vm.onChange({ it.copy(injuries = "Otra") }, EditField.INJURIES)
        vm.onSave()
        advanceUntilIdle()
        assertEquals(mapOf(EditField.INJURIES to "Muy largo"), vm.state.value.errors)
        assertFalse(vm.state.value.saved)
    }

    @Test fun `sin red no guarda`() = runTest {
        val vm = loaded()
        connectivity.state.value = false
        advanceUntilIdle()
        vm.onChange({ it.copy(injuries = "Otra") }, EditField.INJURIES)
        vm.onSave()
        advanceUntilIdle()
        assertTrue(api.patches.isEmpty())
    }

    @Test fun `403 al guardar es terminal y deshabilita Guardar`() = runTest { assertGoneOn(403) }

    @Test fun `404 al guardar es terminal y deshabilita Guardar`() = runTest { assertGoneOn(404) }

    private suspend fun TestScope.assertGoneOn(code: Int) {
        val vm = loaded()
        api.error = apiError(code, "FORBIDDEN")
        vm.onChange({ it.copy(injuries = "Otra") }, EditField.INJURIES)
        vm.onSave()
        advanceUntilIdle()
        assertTrue(vm.state.value.gone)
        assertFalse(vm.state.value.canSave)
        assertEquals(null, vm.state.value.notice)
        vm.onSave()
        advanceUntilIdle()
        assertEquals(1, api.patches.size)
    }
}
