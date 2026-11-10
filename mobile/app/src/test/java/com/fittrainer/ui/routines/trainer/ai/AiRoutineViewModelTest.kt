package com.fittrainer.ui.routines.trainer.ai

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E15: el formulario y la propuesta. La ficha de s1 (fake): fuerza, principiante, lunes y jueves, "Lumbalgia". */
@OptIn(ExperimentalCoroutinesApi::class)
class AiRoutineViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    val aiApi = FakeTrainerAiApi()
    val connectivity = FakeConnectivityObserver()
    val detailApi = FakeStudentDetailApi()
    val details = TrainerStudentDetailRepository(detailApi, FakeTrainerStudentDetailDao(), Clock.systemUTC())
    val routines = TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC())
    val templates = TrainerTemplatesRepository(FakeTrainerTemplatesApi(), FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    val saved = SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1"))

    suspend fun TestScope.vm(handle: SavedStateHandle = saved): AiRoutineViewModel {
        details.refresh("t1", "s1")
        return AiRoutineViewModel(TrainerAiRepository(aiApi), templates, routines, details, FakeTrainerSession(), connectivity, Clock.systemUTC(), handle)
            .also { advanceUntilIdle() }
    }

    @Test fun `precarga la ficha`() = runTest {
        val s = vm().uiState.value
        assertEquals("strength", s.form.goal)
        assertEquals(2, s.form.daysPerWeek)
        assertEquals("Lumbalgia", s.form.injuries)
        assertEquals("Mancuernas, Banco", s.profileEquipment)
    }

    @Test fun `genera y muestra la propuesta`() = runTest {
        val vm = vm()
        vm.onGenerate()
        advanceUntilIdle()
        assertEquals("s1", aiApi.requests.single().studentId)
        assertEquals("Lumbalgia", aiApi.requests.single().injuries)
        assertNotNull(vm.uiState.value.proposal)
        assertFalse(vm.uiState.value.generating)
    }

    @Test fun `un doble toque genera una sola vez`() = runTest {
        aiApi.generateGate = CompletableDeferred()
        val vm = vm()
        vm.onGenerate()
        vm.onGenerate()
        aiApi.generateGate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, aiApi.requests.size)
    }

    @Test fun `sin objetivo ni nivel marca los campos y no pide nada`() = runTest {
        detailApi.detail = detailApi.detail.copy(goal = null, level = null)
        val vm = vm()
        vm.onGenerate()
        advanceUntilIdle()
        assertEquals(setOf(AiField.GOAL, AiField.LEVEL), vm.uiState.value.fieldErrors.keys)
        assertTrue(aiApi.requests.isEmpty())
    }

    @Test fun `si se corta la red el formulario queda y avisa`() = runTest {
        aiApi.generateErrors += IOException()
        val vm = vm()
        vm.onInjuries("Hombro")
        vm.onGenerate()
        advanceUntilIdle()
        assertEquals(AI_NEEDS_NETWORK, vm.uiState.value.notice)
        assertEquals("Hombro", vm.uiState.value.form.injuries)
        assertNull(vm.uiState.value.proposal)
    }

    @Test fun `el 503 ofrece armarla a mano y el 404 del alumno sale`() = runTest {
        aiApi.generateErrors += apiError(503, "AI_UNAVAILABLE")
        val vm = vm()
        vm.onGenerate()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.offerManual)
        aiApi.generateErrors += apiError(404, "STUDENT_NOT_FOUND")
        vm.onGenerate()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.gone)
    }

    @Test fun `el equipamiento cambiado viaja y usar el del perfil lo saca`() = runTest {
        val vm = vm()
        vm.onChangeEquipment()
        vm.onToggleEquipment("barbell")
        vm.onGenerate()
        advanceUntilIdle()
        assertEquals(listOf("barbell"), aiApi.requests.last().availableEquipment)
        vm.onGenerateAnother()
        vm.onUseProfileEquipment()
        vm.onGenerate()
        advanceUntilIdle()
        assertNull(aiApi.requests.last().availableEquipment)
    }

    @Test fun `la propuesta y el formulario vuelven si Android mata el proceso`() = runTest {
        val first = vm()
        first.onPreferences("Sin saltos")
        first.onGenerate()
        advanceUntilIdle()
        val revived = vm(saved)
        assertNotNull(revived.uiState.value.proposal)
        assertEquals("Sin saltos", revived.uiState.value.form.preferences)
    }

    @Test fun `atras con propuesta pide confirmar y descartar sale`() = runTest {
        val vm = vm()
        assertFalse(vm.onBack())
        vm.onGenerate()
        advanceUntilIdle()
        assertTrue(vm.onBack())
        assertTrue(vm.uiState.value.confirmDiscard)
        vm.onConfirmDiscard()
        assertTrue(vm.discarded.value)
    }

    @Test fun `sin red no se genera`() = runTest {
        connectivity.state.value = false
        val vm = vm()
        vm.onGenerate()
        advanceUntilIdle()
        assertTrue(aiApi.requests.isEmpty())
        assertEquals(AI_NEEDS_NETWORK, vm.uiState.value.notice)
    }
}
