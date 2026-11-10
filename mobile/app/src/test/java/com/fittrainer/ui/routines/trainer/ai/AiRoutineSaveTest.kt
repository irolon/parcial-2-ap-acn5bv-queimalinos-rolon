package com.fittrainer.ui.routines.trainer.ai

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
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
import com.fittrainer.testing.fakes.trainerai.proposalDto
import com.fittrainer.ui.routines.trainer.ai.assign.PROPOSAL_GONE
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.time.Clock
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E15: la hoja "Guardar y asignar". s1 tiene la rutina r1 ("Push") activa. Hoy: 09/11/2026. */
@OptIn(ExperimentalCoroutinesApi::class)
class AiRoutineSaveTest {
    @get:Rule val main = MainDispatcherRule()

    private val aiApi = FakeTrainerAiApi().apply { generated = proposalDto(3) }
    private val templatesApi = FakeTrainerTemplatesApi()
    private val routinesApi = FakeTrainerRoutinesApi()
    private val details = TrainerStudentDetailRepository(FakeStudentDetailApi(), FakeTrainerStudentDetailDao(), Clock.systemUTC())
    private val routines = TrainerRoutinesRepository(routinesApi, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val templates = TrainerTemplatesRepository(templatesApi, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val clock = MutableClock(Instant.parse("2026-11-09T15:00:00Z").toEpochMilli())

    private suspend fun TestScope.withProposal(): AiRoutineViewModel {
        details.refresh("t1", "s1")
        val vm = AiRoutineViewModel(TrainerAiRepository(aiApi), templates, routines, details, FakeTrainerSession(), FakeConnectivityObserver(), clock, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1")))
        advanceUntilIdle()
        vm.onGenerate()
        advanceUntilIdle()
        vm.onOpenSave()
        return vm
    }

    @Test fun `la hoja propone un nombre y ofrece pausar la rutina activa`() = runTest {
        val sheet = withProposal().uiState.value.sheet!!
        assertEquals("IA · Ganar fuerza · 09/11", sheet.name)
        assertTrue(sheet.deactivate)
    }

    @Test fun `guardar y asignar pausa la anterior y termina`() = runTest {
        val vm = withProposal()
        vm.onSaveAndAssign()
        advanceUntilIdle()
        assertEquals("IA · Ganar fuerza · 09/11", aiApi.saves.single().templateName)
        assertEquals(3, templatesApi.instantiates.size)
        assertEquals(false, routinesApi.server.getValue("r1").active)
        assertNotNull(vm.uiState.value.done)
    }

    @Test fun `un nombre vacio no guarda`() = runTest {
        val vm = withProposal()
        vm.onTemplateName("   ")
        vm.onSaveAndAssign()
        advanceUntilIdle()
        assertNotNull(vm.uiState.value.sheet!!.nameError)
        assertTrue(aiApi.saves.isEmpty())
    }

    @Test fun `la propuesta que ya no existe vuelve al formulario con el aviso`() = runTest {
        aiApi.saveErrors += apiError(404, "GENERATION_NOT_FOUND")
        val vm = withProposal()
        vm.onSaveAndAssign()
        advanceUntilIdle()
        assertNull(vm.uiState.value.proposal)
        assertNull(vm.uiState.value.sheet)
        assertEquals(PROPOSAL_GONE, vm.uiState.value.notice)
    }

    @Test fun `con plantillas ya guardadas descartar avisa que quedan en Plantillas`() = runTest {
        templatesApi.instantiateFailures += listOf(java.io.IOException())
        val vm = withProposal()
        vm.onSaveAndAssign()
        advanceUntilIdle()
        vm.onDismissSave()
        assertTrue(vm.onBack())
        assertTrue(vm.uiState.value.savedTemplates)
    }

    @Test fun `con el guardado fallado la hoja reabre trabada con el nombre y el check del progreso`() = runTest {
        aiApi.saveErrors += java.io.IOException()
        val vm = withProposal()
        vm.onTemplateName("Mi rutina")
        vm.onToggleDeactivate(false)
        vm.onSaveAndAssign()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.assignStarted)
        vm.onDismissSave()
        vm.onOpenSave()
        val sheet = vm.uiState.value.sheet!!
        assertEquals("Mi rutina", sheet.name)
        assertEquals(false, sheet.deactivate)
        assertTrue(vm.uiState.value.assignStarted)
    }

    @Test fun `con progreso generar otra no descarta la propuesta`() = runTest {
        aiApi.saveErrors += java.io.IOException()
        val vm = withProposal()
        vm.onSaveAndAssign()
        advanceUntilIdle()
        vm.onGenerateAnother()
        assertNotNull(vm.uiState.value.proposal)
    }
}
