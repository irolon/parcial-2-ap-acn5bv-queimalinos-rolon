package com.fittrainer.navigation

import com.fittrainer.MainDispatcherRule
import com.fittrainer.data.TOKEN
import com.fittrainer.data.authState
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class RootViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    /** Al cerrar sesión pasa a LoggedOut (en memoria) y devuelve [result]. */
    private class FakeSessionRepository(var result: LogoutResult) : SessionRepository {
        override val session = MutableStateFlow<Session>(Session.Student(authState().user))
        override suspend fun signOut(): LogoutResult {
            session.value = Session.LoggedOut
            return result
        }
    }

    private val repo = FakeSessionRepository(LogoutResult.Closed)
    // lazy: el ViewModel se crea dentro del test, con Dispatchers.Main ya reemplazado por la regla.
    private val pending = PendingInvitation()
    private val vm by lazy { RootViewModel(repo, pending) }

    // Codex P2 (ronda 3): un logout que no se pudo persistir no termina en silencio.
    @Test fun `signOut Incomplete deja el aviso`() {
        repo.result = LogoutResult.Incomplete
        vm.signOut()
        assertEquals(RootViewModel.SIGN_OUT_WARNING, vm.signOutWarning.value)
    }

    @Test fun `signOut Closed no deja aviso`() {
        vm.signOut()
        assertNull(vm.signOutWarning.value)
    }

    @Test fun `el aviso se borra cuando vuelve a haber sesion`() {
        repo.result = LogoutResult.Incomplete
        vm.signOut()

        repo.session.value = Session.Trainer(authState().user)

        assertNull(vm.signOutWarning.value)
    }

    // Review: un cierre posterior por otro camino (refresh rechazado) no revive el aviso viejo.
    @Test fun `tras un login el aviso viejo no reaparece si la sesion se cierra por otro camino`() {
        repo.result = LogoutResult.Incomplete
        vm.signOut()
        repo.session.value = Session.Trainer(authState().user)

        repo.session.value = Session.LoggedOut

        assertNull(vm.signOutWarning.value)
    }

    @Test fun `dismissSignOutWarning borra el aviso`() {
        repo.result = LogoutResult.Incomplete
        vm.signOut()

        vm.dismissSignOutWarning()

        assertNull(vm.signOutWarning.value)
    }

    // Review Focus 3: deep link con sesión iniciada.
    @Test fun `deep link con sesion muestra el aviso`() {
        pending.offer(TOKEN)
        assertEquals(true, vm.invitationWhileLoggedIn.value)
    }

    @Test fun `cerrar el aviso descarta el token`() {
        pending.offer(TOKEN)
        vm.dismissPendingInvitation()
        assertEquals(false, vm.invitationWhileLoggedIn.value)
        assertNull(pending.token.value)
    }

    @Test fun `deep link sin sesion no muestra aviso y queda para la navegacion`() {
        repo.session.value = Session.LoggedOut
        pending.offer(TOKEN)
        assertEquals(false, vm.invitationWhileLoggedIn.value)
        assertEquals(TOKEN, vm.pendingInvitation.value)
    }
}
