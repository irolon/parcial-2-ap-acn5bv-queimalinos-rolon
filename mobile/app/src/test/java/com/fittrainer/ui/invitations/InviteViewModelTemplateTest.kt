package com.fittrainer.ui.invitations

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.invitation.invite.InviteField
import com.fittrainer.data.invitation.invite.InviteRepository
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.invitation.FakeTrainerInvitationApi
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.templates.templateDto
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class InviteViewModelTemplateTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerInvitationApi()
    private val templates = FakeTrainerTemplatesApi().apply { server["t2"] = templateDto("t2", "Pierna", listOf("tuesday")) }
    private val templatesDao = FakeTrainerTemplatesDao()
    private val saved = SavedStateHandle()
    private val connectivity = FakeConnectivityObserver()

    private fun newVm() = InviteViewModel(
        InviteRepository(api),
        connectivity,
        InitialTemplatesSource(
            TrainerTemplatesRepository(
                templates, templatesDao, TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC()), Clock.systemUTC(),
            ),
            FakeTrainerSession(),
        ),
        saved,
    )

    private val vm by lazy { newVm() }
    private val editing get() = vm.state.value as InviteUiState.Editing
    private fun InviteViewModel.form() = (state.value as InviteUiState.Editing).form

    @Test fun `la lista de plantillas llega al formulario`() = runTest {
        advanceUntilIdle()
        val ready = editing.templates as TemplateChoices.Ready
        assertEquals(setOf("tp1", "t2"), ready.templates.map { it.id }.toSet())
    }

    @Test fun `elegir una plantilla precarga sus dias y otra los reemplaza`() = runTest {
        advanceUntilIdle()
        vm.onTemplate("tp1")
        assertEquals("tp1", editing.form.templateId)
        assertEquals(setOf("monday", "friday"), editing.form.routineDays)
        vm.onTemplate("t2")
        assertEquals(setOf("tuesday"), editing.form.routineDays)
        vm.onTemplate(null)
        assertNull(editing.form.templateId)
        assertTrue(editing.form.routineDays.isEmpty())
    }

    @Test fun `los dias se prenden y apagan`() = runTest {
        advanceUntilIdle()
        vm.onTemplate("t2")
        vm.onToggleDay("monday")
        assertEquals(setOf("tuesday", "monday"), editing.form.routineDays)
        vm.onToggleDay("tuesday")
        assertEquals(setOf("monday"), editing.form.routineDays)
    }

    @Test fun `un VM nuevo con el mismo SavedStateHandle recupera plantilla y dias`() = runTest {
        advanceUntilIdle()
        vm.onTemplate("tp1")
        vm.onToggleDay("sunday")
        val form = newVm().form()
        assertEquals("tp1", form.templateId)
        assertEquals(setOf("monday", "friday", "sunday"), form.routineDays)
    }

    @Test fun `si la plantilla elegida desaparece de la lista se limpia con sus dias`() = runTest {
        advanceUntilIdle()
        vm.onTemplate("tp1")
        templatesDao.rows.update { m -> m.filterKeys { it.second != "tp1" } }
        advanceUntilIdle()
        assertNull(editing.form.templateId)
        assertTrue(editing.form.routineDays.isEmpty())
        assertNull(newVm().form().templateId)
    }

    @Test fun `TEMPLATE_NOT_FOUND vuelve a pedir la lista`() = runTest {
        advanceUntilIdle()
        vm.onChange(InviteField.NAME, "Pedro Gómez")
        vm.onChange(InviteField.EMAIL, "pedro@mail.com")
        vm.onTemplate("tp1")
        templates.server.remove("tp1")
        api.error = apiError(404, "TEMPLATE_NOT_FOUND")
        vm.onSubmit()
        advanceUntilIdle()
        val ready = editing.templates as TemplateChoices.Ready
        assertEquals(listOf("t2"), ready.templates.map { it.id })
        assertNull(editing.form.templateId)
    }

    @Test fun `invitar a otro limpia la plantilla guardada`() = runTest {
        advanceUntilIdle()
        vm.onTemplate("tp1")
        vm.onInviteAnother()
        assertNull(newVm().form().templateId)
        assertTrue(editing.templates is TemplateChoices.Ready)
    }
}
