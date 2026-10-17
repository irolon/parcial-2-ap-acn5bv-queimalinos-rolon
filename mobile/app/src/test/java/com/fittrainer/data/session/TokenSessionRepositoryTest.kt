package com.fittrainer.data.session

import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.testing.fakes.auth.authState
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class TokenSessionRepositoryTest {

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val cleaner = FakeCleaner()
    private val repo = TokenSessionRepository(store, AuthRepository(api, store, fixedClock()), cleaner)

    @Test fun `sin sesion guardada es LoggedOut`() = runTest {
        assertEquals(Session.LoggedOut, repo.session.first())
    }

    @Test fun `sesion de alumno es Student con su usuario`() = runTest {
        store.save(authState(role = Role.STUDENT))
        assertEquals(Session.Student(authState().user), repo.session.first())
    }

    @Test fun `sesion de entrenador es Trainer con su usuario`() = runTest {
        val trainer = authState(role = Role.TRAINER)
        store.save(trainer)
        assertEquals(Session.Trainer(trainer.user), repo.session.first())
    }

    @Test fun `signOut vuelve a LoggedOut y revoca en el backend`() = runTest {
        store.save(authState())
        assertEquals(LogoutResult.Closed, repo.signOut())
        assertEquals(Session.LoggedOut, repo.session.first())
        assertEquals(1, api.logoutCalls.size)
    }

    @Test fun `signOut borra los datos del usuario del dispositivo`() = runTest {
        store.save(authState())
        repo.signOut()
        assertEquals(1, cleaner.calls)
    }

    // Codex P2: el borrado queda atado al usuario que se va, no a quien esté logueado cuando termina.
    @Test fun `signOut borra solo los datos del usuario que cierra sesion`() = runTest {
        store.save(authState())
        repo.signOut()
        assertEquals(listOf<String?>(authState().user.id), cleaner.owners)
    }

    @Test fun `si el borrado falla la sesion igual queda cerrada`() = runTest {
        store.save(authState())
        cleaner.error = IllegalStateException("disco")
        assertEquals(LogoutResult.Closed, repo.signOut())
        assertEquals(Session.LoggedOut, repo.session.first())
    }

    private class FakeCleaner : UserDataCleaner {
        var calls = 0
        var owners = mutableListOf<String?>()
        var error: Exception? = null
        override suspend fun clearUserData(ownerId: String?) {
            calls++
            owners += ownerId
            error?.let { throw it }
        }
    }
}
