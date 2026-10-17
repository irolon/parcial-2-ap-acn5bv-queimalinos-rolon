package com.fittrainer.data.session

import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Cerrar sesión con el caché de rutinas real: se borra el del que sale y nunca el de una sesión posterior. */
@OptIn(ExperimentalCoroutinesApi::class)
class SignOutCacheTest {

    private val authApi = FakeAuthApi()
    private val store = FakeTokenStore()
    private val routines = RoutineRepository(FakeRoutineApi(), FakeRoutineDao(), fixedClock())
    private val sessions = TokenSessionRepository(store, AuthRepository(authApi, store, fixedClock()), routines)

    private suspend fun cachedIds() = routines.observeCache(authState().user.id).first().routines.map { it.id }

    @Test fun `cerrar sesion deja el cache vacio`() = runTest {
        store.save(authState())
        routines.refresh(authState().user.id)

        sessions.signOut()

        assertTrue(cachedIds().isEmpty())
    }

    // Codex: A cierra sesión, la revocación queda pendiente, A vuelve a entrar y sincroniza.
    @Test fun `un logout demorado no vacia el cache de una sesion nueva de la misma cuenta`() = runTest {
        store.save(authState(session = "session-1"))
        routines.refresh(authState().user.id)
        val revocation = CompletableDeferred<Unit>()
        authApi.logoutGate = revocation

        val logout = backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { sessions.signOut() }
        assertEquals(Session.LoggedOut, sessions.session.first())

        store.save(authState(session = "session-2"))
        routines.refresh(authState().user.id)
        revocation.complete(Unit)
        logout.join()

        assertEquals(listOf("rt-1"), cachedIds())
    }
}
