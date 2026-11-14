package com.fittrainer.ui.account.forced

import com.fittrainer.data.account.PASSWORD_RULES_ERROR
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.data.notifications.push.PushLogger
import com.fittrainer.data.notifications.push.PushTokenRegistry
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.SyncLogger
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.account.FakeMyProfileDao
import com.fittrainer.testing.fakes.account.FakeProfileApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.notifications.FakeFcmTokenSource
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.sync.FakeSessionSync
import com.fittrainer.ui.account.NEEDS_CONNECTION
import com.fittrainer.ui.account.TOO_MANY_ATTEMPTS
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.map
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

/** GX1-M1: la pantalla de la clave temporal usa las reglas de Cambiar contraseña y, al guardar, reengancha push y sync. */
@OptIn(ExperimentalCoroutinesApi::class)
class ForcedPasswordViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeProfileApi()
    private val tokens = FakeTokenStore(authState().let { it.copy(user = it.user.copy(mustChangePassword = true)) })
    private val net = FakeConnectivityObserver()
    private val notifications = FakeNotificationsApi()
    private val sync = FakeSessionSync()
    private val repo = ProfileRepository(api, FakeMyProfileDao(), tokens, FakeFcmTokenSource(), Clock.systemUTC())
    private val pushFcm = FakeFcmTokenSource()
    private val push = PushTokenRegistry(notifications, tokens, pushFcm, object : PushLogger() {
        override fun failed(what: String, error: Exception) = Unit
    })
    private val syncLogger = object : SyncLogger() {
        override fun enqueueFailed(error: Exception) = Unit
    }

    /** La sesión es la del TokenStore, como en la app: sacar la marca se ve enseguida. */
    private val sessions = object : SessionRepository {
        override val session = tokens.flow.map { state -> state?.let { Session.Student(it.user) } ?: Session.LoggedOut }
        override suspend fun signOut() = LogoutResult.Closed
    }

    /** El alcance de la app en el test: corre enseguida y vive fuera del ViewModel (un push colgado no frena el runTest). */
    private fun TestScope.appScope() = CoroutineScope(UnconfinedTestDispatcher(testScheduler) + SupervisorJob())

    private fun TestScope.started(): ForcedPasswordViewModel {
        val vm = ForcedPasswordViewModel(repo, sessions, net, push, sync, syncLogger, appScope())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        return vm
    }

    private fun TestScope.save(vm: ForcedPasswordViewModel, temporary: String = "Temporal1", new: String = "Nueva1234") {
        vm.onCurrent(temporary)
        vm.onNew(new)
        vm.onRepeat(new)
        vm.onSave()
        advanceUntilIdle()
    }

    private fun flagged() = tokens.flow.value!!.user.mustChangePassword

    @Test fun guardarSacaLaMarcaRegistraElPushYEncolaLaSync() = runTest {
        val vm = started()
        save(vm)
        assertFalse(flagged())
        assertEquals("access-nuevo", tokens.flow.value!!.accessToken)
        assertEquals("fcm-token-1", notifications.registered.single().token)
        assertEquals(listOf(true), sync.enqueues)
    }

    @Test fun conElPushOLaSyncQueFallanIgualSale() = runTest {
        notifications.failTokens = IOException("sin red")
        sync.enqueueError = IllegalStateException("WorkManager")
        val vm = started()
        save(vm)
        assertFalse(flagged())
        assertEquals(1, sync.enqueued)
    }

    @Test fun alGuardarSeVacianLasClaves() = runTest {
        val vm = started()
        save(vm)
        assertEquals("", vm.uiState.value.current)
        assertEquals("", vm.uiState.value.new)
    }

    @Test fun lasReglasSeAvisanSinMandar() = runTest {
        val vm = started()
        save(vm, new = "corta")
        assertEquals(PASSWORD_RULES_ERROR, vm.uiState.value.newError)
        assertTrue(api.passwords.isEmpty())
        assertTrue(flagged())
    }

    @Test fun laTemporalIncorrectaVaEnSuCampo() = runTest {
        api.error = httpError(400, """{"error":{"details":[{"field":"current_password","message":"La contraseña actual no es correcta"}]}}""")
        val vm = started()
        save(vm, temporary = "Mala1234")
        assertEquals("La contraseña actual no es correcta", vm.uiState.value.currentError)
        assertTrue(flagged())
        assertTrue(notifications.registered.isEmpty())
        assertTrue(sync.enqueues.isEmpty())
    }

    @Test fun sinRedNoSeMandaYSeAvisa() = runTest {
        net.state.value = false
        val vm = started()
        save(vm)
        assertTrue(vm.uiState.value.offline)
        assertTrue(api.passwords.isEmpty())
        api.error = IOException("sin red")
        net.state.value = true
        vm.onSave()
        advanceUntilIdle()
        assertEquals(NEEDS_CONNECTION, vm.uiState.value.error)
        assertTrue(flagged())
    }

    @Test fun demasiadosIntentosTieneSuAviso() = runTest {
        api.error = httpError(429)
        val vm = started()
        save(vm)
        assertEquals(TOO_MANY_ATTEMPTS, vm.uiState.value.error)
        assertTrue(flagged())
    }

    // Otra cuenta que entra con su propia clave temporal no ve lo que escribió la anterior.
    @Test fun cambiarDeCuentaVaciaElFormulario() = runTest {
        val vm = started()
        vm.onCurrent("Escrita1")
        tokens.flow.value = null
        advanceUntilIdle()
        assertEquals("", vm.uiState.value.current)
    }

    // Con FCM colgado el registro del push no termina, pero la sync se encola igual: van por separado.
    @Test fun conFcmColgadoLaSyncSeEncolaIgual() = runTest {
        pushFcm.gate = CompletableDeferred()
        save(started())
        assertFalse(flagged())
        assertEquals(listOf(true), sync.enqueues)
    }
}
