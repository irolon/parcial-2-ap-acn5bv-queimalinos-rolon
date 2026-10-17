package com.fittrainer.ui.join

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.FakeInvitationApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.TOKEN
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.data.api.RegisterStudentRequest
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.data.invitation.InvitationRepository
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ConfirmInvitationViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val invitationApi = FakeInvitationApi()
    private val authApi = FakeAuthApi()
    private val store = FakeTokenStore()

    private fun vm() = ConfirmInvitationViewModel(
        SavedStateHandle(mapOf(TOKEN_ARG to TOKEN)),
        InvitationRepository(invitationApi),
        AuthRepository(authApi, store, fixedClock()),
    )

    private fun ConfirmInvitationViewModel.ready() = uiState.value as ConfirmInvitationUiState.Ready

    @Test fun `carga la invitacion del token`() = runTest {
        val vm = vm()
        assertEquals("Laura", vm.ready().invitation.trainerName)
        assertEquals(listOf(TOKEN), invitationApi.calls)
    }

    @Test fun `invitacion vencida muestra el error sin reintento`() = runTest {
        invitationApi.error = apiError(410, "INVITATION_EXPIRED")
        val state = vm().uiState.value as ConfirmInvitationUiState.Error
        assertEquals("Esta invitación venció, pedile una nueva a tu profe", state.message.text)
        assertFalse(state.message.canRetry)
    }

    @Test fun `sin red y reintentar vuelve a cargar`() = runTest {
        invitationApi.error = IOException("sin red")
        val vm = vm()
        assertTrue((vm.uiState.value as ConfirmInvitationUiState.Error).message.canRetry)
        invitationApi.error = null
        vm.retry()
        assertEquals("Laura", vm.ready().invitation.trainerName)
    }

    // Review Focus 5: el límite es 8 y la contraseña va tal cual.
    @Test fun `con 7 caracteres no envia`() = runTest {
        val vm = vm()
        vm.onPasswordChange("1234567")
        assertFalse(vm.ready().canSubmit)
        vm.submit()
        assertTrue(authApi.registerCalls.isEmpty())
    }

    @Test fun `con 8 caracteres envia la contraseña sin trim`() = runTest {
        val vm = vm()
        vm.onPasswordChange(" 1234567")
        vm.submit()
        assertEquals(listOf(RegisterStudentRequest(TOKEN, " 1234567")), authApi.registerCalls)
        assertNotNull(store.current())
    }

    @Test fun `alta exitosa borra la contraseña del estado`() = runTest {
        val vm = vm()
        vm.onPasswordChange("Secreta123")
        vm.submit()
        assertNotNull(store.current())
        assertEquals("", vm.ready().password)
        assertTrue(vm.ready().isSubmitting)
    }

    @Test fun `doble envio hace una sola llamada`() = runTest {
        val gate = CompletableDeferred<Unit>()
        val vm = ConfirmInvitationViewModel(
            SavedStateHandle(mapOf(TOKEN_ARG to TOKEN)),
            InvitationRepository(invitationApi),
            AuthRepository(GatedAuthApi(authApi, gate), store, fixedClock()),
        )
        vm.onPasswordChange("Secreta123")
        vm.submit()
        vm.submit()
        assertTrue(vm.ready().isSubmitting)
        gate.complete(Unit)
        assertEquals(1, authApi.registerCalls.size)
    }

    @Test fun `error al enviar conserva la contraseña y ofrece login`() = runTest {
        authApi.registerError = apiError(409, "STUDENT_EMAIL_EXISTS")
        val vm = vm()
        vm.onPasswordChange("Secreta123")
        vm.submit()
        val state = vm.ready()
        assertEquals("Secreta123", state.password)
        assertFalse(state.isSubmitting)
        assertEquals("Ya hay una cuenta con ese email. Iniciá sesión.", state.submitError?.text)
        assertTrue(state.submitError!!.offerLogin)
    }

    @Test fun `editar la contraseña borra el error de envio`() = runTest {
        authApi.registerError = IOException("sin red")
        val vm = vm()
        vm.onPasswordChange("Secreta123")
        vm.submit()
        vm.onPasswordChange("Secreta1234")
        assertEquals(null, vm.ready().submitError)
    }
}

/** Demora el alta hasta que se complete [gate]; el resto delega en [delegate]. */
private class GatedAuthApi(
    private val delegate: FakeAuthApi,
    private val gate: CompletableDeferred<Unit>,
) : com.fittrainer.data.api.AuthApi by delegate {
    override suspend fun registerStudent(body: RegisterStudentRequest) = gate.await().let { delegate.registerStudent(body) }
}
