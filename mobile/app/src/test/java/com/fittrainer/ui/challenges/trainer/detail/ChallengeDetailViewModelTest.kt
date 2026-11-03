package com.fittrainer.ui.challenges.trainer.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.challenges.trainer.TrainerChallengesRepository
import com.fittrainer.data.students.TrainerStudentsRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesApi
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.students.FakeStudentsApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentsDao
import com.fittrainer.testing.fakes.students.studentDto
import com.fittrainer.ui.challenges.trainer.ASSIGN_FAILED
import java.io.IOException
import com.fittrainer.ui.challenges.trainer.NEEDS_NETWORK
import com.fittrainer.testing.fakes.auth.httpError
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ChallengeDetailViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerChallengesApi()
    private val connectivity = FakeConnectivityObserver()
    private val repo = TrainerChallengesRepository(api, FakeTrainerChallengesDao(), MutableClock(0))
    private val studentsApi = FakeStudentsApi(
        pages = mapOf(
            true to listOf(listOf(studentDto("s2", "Beto"), studentDto("s1", "Ana"))),
            false to listOf(listOf(studentDto("s9", "Zoe", active = false))),
        ),
    )
    private val students = TrainerStudentsRepository(studentsApi, FakeTrainerStudentsDao(), MutableClock(0))

    private fun TestScope.started(id: String = "c1"): ChallengeDetailViewModel {
        val vm = ChallengeDetailViewModel(repo, students, FakeTrainerSession(), connectivity, SavedStateHandle(mapOf(CHALLENGE_ID_ARG to id)))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        return vm
    }

    @Test fun `muestra el desafio y solo los alumnos activos por nombre`() = runTest {
        val state = started().uiState.value
        assertEquals("12 sesiones", state.challenge?.name)
        assertEquals(listOf("Ana", "Beto"), state.students.map { it.name })
    }

    @Test fun `asignar a dos manda un solo POST en orden y resume`() = runTest {
        val vm = started()
        vm.onAssign()
        vm.onToggle("s2")
        vm.onToggle("s1")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(listOf("c1" to listOf("s1", "s2")), api.batchCalls)
        assertNull(vm.uiState.value.pick)
        assertEquals("Asignado a 2 alumnos", vm.uiState.value.notice)
    }

    @Test fun `doble toque en Asignar es un solo POST`() = runTest {
        val vm = started()
        api.writeGate = CompletableDeferred()
        vm.onAssign()
        vm.onToggle("s1")
        vm.onSubmit()
        vm.onSubmit()
        advanceUntilIdle()
        api.writeGate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, api.batchCalls.size)
    }

    @Test fun `si todos ya lo tenian el aviso no dice asignado a 0`() = runTest {
        val vm = started()
        repo.assignToStudent("t1", "s1", "c1")
        vm.onAssign()
        vm.onToggle("s1")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals("Ya lo tenían activo: Ana", vm.uiState.value.notice)
    }

    @Test fun `sin red no manda y avisa en la hoja`() = runTest {
        val vm = started()
        connectivity.state.value = false
        vm.onAssign()
        vm.onToggle("s1")
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(api.batchCalls.isEmpty())
        assertEquals(NEEDS_NETWORK, vm.uiState.value.pick?.error)
    }

    @Test fun `un error del servidor deja la hoja abierta con lo elegido`() = runTest {
        val vm = started()
        api.writeError = httpError(500)
        vm.onAssign()
        vm.onToggle("s1")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(ASSIGN_FAILED, vm.uiState.value.pick?.error)
        assertEquals(setOf("s1"), vm.uiState.value.pick?.selected)
    }

    @Test fun `un 404 al asignar marca el desafio como inexistente`() = runTest {
        val vm = started()
        api.challenges = api.challenges.filter { it.id != "c1" }
        vm.onAssign()
        vm.onToggle("s1")
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.gone)
        assertNull(vm.uiState.value.pick)
    }

    @Test fun `un desafio que ya no esta en la lista es inexistente`() = runTest {
        assertTrue(started("nope").uiState.value.gone)
    }

    // Ronda 1 de Codex: entrar por Más sin haber abierto Alumnos no deja la hoja vacía.
    @Test fun `sin cache de alumnos los baja al entrar`() = runTest {
        val state = started().uiState.value
        assertEquals(StudentsLoad.READY, state.studentsLoad)
        assertEquals(listOf("Ana", "Beto"), state.students.map { it.name })
    }

    @Test fun `si no se pudieron bajar los alumnos no dice que no hay activos y deja reintentar`() = runTest {
        studentsApi.failOn = true to 1
        studentsApi.error = IOException("sin red")
        val vm = started()
        assertEquals(StudentsLoad.FAILED, vm.uiState.value.studentsLoad)
        assertTrue(vm.uiState.value.students.isEmpty())
        studentsApi.failOn = null
        vm.onRetryStudents()
        advanceUntilIdle()
        assertEquals(StudentsLoad.READY, vm.uiState.value.studentsLoad)
        assertEquals(2, vm.uiState.value.students.size)
    }
}
