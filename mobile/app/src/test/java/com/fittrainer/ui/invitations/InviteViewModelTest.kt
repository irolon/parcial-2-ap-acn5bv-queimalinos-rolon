package com.fittrainer.ui.invitations

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.invitation.invite.InviteField
import com.fittrainer.data.invitation.invite.InviteRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.invitation.FakeTrainerInvitationApi
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class InviteViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerInvitationApi()
    private val connectivity = FakeConnectivityObserver()
    private val saved = SavedStateHandle()
    private val vm by lazy { InviteViewModel(InviteRepository(api), connectivity, saved) }

    private val editing get() = vm.state.value as InviteUiState.Editing

    private fun fillValid() {
        vm.onChange(InviteField.NAME, "Pedro Gómez")
        vm.onChange(InviteField.EMAIL, "pedro@mail.com")
    }

    @Test fun `con errores no llama al servidor y los muestra`() = runTest {
        vm.onChange(InviteField.NAME, "P")
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(api.requests.isEmpty())
        assertEquals(setOf(InviteField.NAME, InviteField.EMAIL), editing.errors.keys)
    }

    @Test fun `doble toque crea una sola invitacion`() = runTest {
        api.gate = CompletableDeferred()
        fillValid()
        vm.onSubmit()
        advanceUntilIdle()
        vm.onSubmit()
        advanceUntilIdle()
        api.gate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, api.requests.size)
        assertTrue(vm.state.value is InviteUiState.Done)
    }

    @Test fun `sin red no envia`() = runTest {
        connectivity.state.value = false
        fillValid()
        advanceUntilIdle()
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(api.requests.isEmpty())
        assertTrue(editing.offline)
    }

    @Test fun `exito pasa al resultado con el nombre`() = runTest {
        fillValid()
        vm.onSubmit()
        advanceUntilIdle()
        val done = vm.state.value as InviteUiState.Done
        assertEquals("Pedro Gómez", done.studentName)
    }

    @Test fun `400 del servidor queda en su campo y se borra al editarlo`() = runTest {
        api.error = httpError(
            400,
            """{"error":{"code":"VALIDATION_ERROR","message":"x","details":[{"field":"student_email","message":"Email con formato inválido"}]}}""",
        )
        fillValid()
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(mapOf(InviteField.EMAIL to "Email con formato inválido"), editing.errors)

        vm.onChange(InviteField.EMAIL, "otro@mail.com")
        assertTrue(editing.errors.isEmpty())
    }

    @Test fun `error de red avisa y conserva lo escrito`() = runTest {
        api.error = IOException("sin red")
        fillValid()
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(INVITE_NETWORK_FAILED, editing.notice)
        assertEquals("Pedro Gómez", editing.form.name)
    }

    @Test fun `invitar a otro vuelve al formulario vacio`() = runTest {
        fillValid()
        vm.onSubmit()
        advanceUntilIdle()
        vm.onInviteAnother()
        assertEquals("", editing.form.name)
        assertTrue(editing.errors.isEmpty())
    }

    @Test fun `sin red durante el resultado, invitar a otro vuelve al formulario sin red`() = runTest {
        fillValid()
        vm.onSubmit()
        advanceUntilIdle()
        connectivity.state.value = false
        advanceUntilIdle()
        vm.onInviteAnother()
        assertTrue(editing.offline)
        vm.onChange(InviteField.NAME, "Otra Persona")
        vm.onChange(InviteField.EMAIL, "otra@mail.com")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(1, api.requests.size)
    }

    @Test fun `un error local en Mas datos despliega la seccion`() = runTest {
        fillValid()
        vm.onChange(InviteField.PHONE, "11-22")
        assertFalse(editing.showMore)
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(editing.showMore)
        assertTrue(InviteField.PHONE in editing.errors)
    }

    @Test fun `un error del servidor en Mas datos despliega la seccion`() = runTest {
        api.error = httpError(
            400,
            """{"error":{"code":"VALIDATION_ERROR","message":"x","details":[{"field":"injuries","message":"Muy largo"}]}}""",
        )
        fillValid()
        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(editing.showMore)
        assertEquals(mapOf(InviteField.INJURIES to "Muy largo"), editing.errors)
    }

    @Test fun `un error fuera de Mas datos no la despliega`() = runTest {
        vm.onSubmit()
        advanceUntilIdle()
        assertFalse(editing.showMore)
    }

    @Test fun `el formulario sobrevive en el SavedStateHandle`() = runTest {
        fillValid()
        vm.onAddEquipment(" barra ")
        val again = InviteViewModel(InviteRepository(api), connectivity, saved)
        val form = (again.state.value as InviteUiState.Editing).form
        assertEquals("pedro@mail.com", form.email)
        assertEquals(listOf("barra"), form.equipment)
    }
}
