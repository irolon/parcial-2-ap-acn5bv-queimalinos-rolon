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
    private val repo = TokenSessionRepository(store, AuthRepository(api, store, fixedClock()))

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
}
