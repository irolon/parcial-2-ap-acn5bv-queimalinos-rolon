package com.fittrainer.ui.account.password

import com.fittrainer.data.account.PASSWORD_RULES_ERROR
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.data.account.REPEAT_ERROR
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.ui.account.NEEDS_CONNECTION
import com.fittrainer.ui.account.TOO_MANY_ATTEMPTS
import java.io.IOException
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.notifications.FakeFcmTokenSource
import com.fittrainer.testing.fakes.account.FakeMyProfileDao
import com.fittrainer.testing.fakes.account.FakeProfileApi
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ChangePasswordViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeProfileApi()
    private val tokens = FakeTokenStore(authState())
    private val net = FakeConnectivityObserver()
    private val repo = ProfileRepository(api, FakeMyProfileDao(), tokens, FakeFcmTokenSource(), Clock.systemUTC())

    private fun TestScope.started(): ChangePasswordViewModel {
        val vm = ChangePasswordViewModel(repo, FakeStudentSession(), net)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        return vm
    }

    private fun ChangePasswordViewModel.fill(current: String, new: String, repeat: String = new) {
        onCurrent(current)
        onNew(new)
        onRepeat(repeat)
    }

    @Test fun claveValidaSeCambiaYTermina() = runTest {
        val vm = started()
        vm.fill("Vieja1234", "Nueva1234")
        vm.onSave()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.done)
        assertEquals("access-nuevo", tokens.current()!!.accessToken)
    }

    @Test fun reglasYRepetirSeAvisanSinMandar() = runTest {
        val vm = started()
        vm.fill("Vieja1234", "corta", "otra")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(PASSWORD_RULES_ERROR, vm.uiState.value.newError)
        assertEquals(REPEAT_ERROR, vm.uiState.value.repeatError)
        assertTrue(api.passwords.isEmpty())
    }

    @Test fun actualIncorrectaVaDebajoDeEseCampo() = runTest {
        val vm = started()
        api.error = httpError(400, """{"error":{"message":"x","details":[{"field":"current_password","message":"La contraseña actual no es correcta"}]}}""")
        vm.fill("Mala1234", "Nueva1234")
        vm.onSave()
        advanceUntilIdle()
        assertEquals("La contraseña actual no es correcta", vm.uiState.value.currentError)
        assertNull(vm.uiState.value.error)
        assertFalse(vm.uiState.value.done)
    }

    @Test fun sinRedNoSeManda() = runTest {
        val vm = started()
        net.state.value = false
        vm.fill("Vieja1234", "Nueva1234")
        advanceUntilIdle()
        assertFalse(vm.uiState.value.canSave)
        vm.onSave()
        advanceUntilIdle()
        assertTrue(api.passwords.isEmpty())
    }

    @Test fun unErrorDeOtroCampoSeMuestraArriba() = runTest {
        val vm = started()
        api.error = httpError(400, """{"error":{"message":"Error de validación","details":[{"field":"refresh_token","message":"La sesión de este dispositivo no es válida"}]}}""")
        vm.fill("Vieja1234", "Nueva1234")
        vm.onSave()
        advanceUntilIdle()
        assertEquals("La sesión de este dispositivo no es válida", vm.uiState.value.error)
        assertNull(vm.uiState.value.currentError)
    }

    @Test fun demasiadosIntentosOSinRedTienenSuAviso() = runTest {
        val vm = started()
        api.error = httpError(429)
        vm.fill("Vieja1234", "Nueva1234")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(TOO_MANY_ATTEMPTS, vm.uiState.value.error)
        api.error = IOException("sin red")
        vm.onSave()
        advanceUntilIdle()
        assertEquals(NEEDS_CONNECTION, vm.uiState.value.error)
        assertFalse(vm.uiState.value.done)
    }
}
