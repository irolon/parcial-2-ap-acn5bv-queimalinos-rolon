package com.fittrainer.ui.account

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.account.ProfileRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.notifications.FakeFcmTokenSource
import com.fittrainer.testing.fakes.account.FakeMyProfileDao
import com.fittrainer.testing.fakes.account.FakeProfileApi
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import java.io.IOException
import java.time.Clock
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
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

/** Perfil / Más: refresca al entrar y al volver la red; sin red no es una falla; el aviso de la contraseña. */
@OptIn(ExperimentalCoroutinesApi::class)
class AccountViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeProfileApi()
    private val net = FakeConnectivityObserver()
    private val repo = ProfileRepository(api, FakeMyProfileDao(), FakeTokenStore(authState()), FakeFcmTokenSource(), Clock.systemUTC())
    private val messages = TrainerMessagesRepository(
        FakeTrainerMessagesApi(), FakeTrainerMessagesDao(), StepClock(Instant.parse("2026-11-13T12:00:00Z")),
    )
    private val saved = SavedStateHandle()

    private fun TestScope.started(): AccountViewModel {
        val vm = AccountViewModel(repo, messages, FakeStudentSession(), net, saved)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        return vm
    }

    @Test fun alEntrarBajaElPerfilARoom() = runTest {
        val vm = started()
        vm.onStart()
        advanceUntilIdle()
        val s = vm.uiState.value
        assertTrue(s.everLoaded)
        assertEquals("11 5555 5555", s.phone)
        assertEquals("https://x/a.jpg?sig=1", s.avatarUrl)
    }

    @Test fun unaFallaConRedSeAvisaYSinRedNo() = runTest {
        val vm = started()
        api.error = httpError(500)
        vm.onStart()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.refreshFailed)
        vm.onDismissRefreshFailed()
        net.state.value = false
        advanceUntilIdle()
        api.error = IOException("sin red")
        vm.onStart()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.refreshFailed)
        assertTrue(vm.uiState.value.offline)
    }

    @Test fun alVolverLaRedRefresca() = runTest {
        net.state.value = false
        val vm = started()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.everLoaded)
        net.state.value = true
        advanceUntilIdle()
        assertTrue(vm.uiState.value.everLoaded)
    }

    @Test fun elAvisoDeContrasenaSeMuestraYSeCierra() = runTest {
        val vm = started()
        vm.onPasswordChanged()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.passwordChanged)
        vm.onDismissPasswordChanged()
        advanceUntilIdle()
        assertFalse(vm.uiState.value.passwordChanged)
    }

    @Test fun siLaSesionLlegaDespuesDeEntrarIgualBajaElPerfil() = runTest {
        val late = object : SessionRepository {
            override val session = MutableSharedFlow<Session>(replay = 1)
            override suspend fun signOut() = LogoutResult.Closed
        }
        val vm = AccountViewModel(repo, messages, late, net, saved)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertTrue(api.owners.isEmpty())
        late.session.emit(Session.Student(AuthUser("u1", "Ana Pérez", "ana@test.com", Role.STUDENT)))
        advanceUntilIdle()
        assertTrue(vm.uiState.value.everLoaded)
        assertEquals("11 5555 5555", vm.uiState.value.phone)
    }
}
