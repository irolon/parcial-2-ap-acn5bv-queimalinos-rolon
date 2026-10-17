package com.fittrainer.data.auth.authrepository

import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.api.UserDto
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Role
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthRepositoryLoginTest {

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val repo = AuthRepository(api, store, fixedClock())

    private fun Result<*>.dataError() = (exceptionOrNull() as DataException).error

    @Test fun `login ok guarda tokens y usuario`() = runTest {
        val result = repo.login("ana@test.com", "Secreta123")

        assertEquals(AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT), result.getOrNull())
        val saved = store.current()!!
        assertEquals(authState(session = saved.sessionId), saved)
        assertEquals(listOf(LoginRequest("ana@test.com", "Secreta123")), api.loginCalls)
    }

    @Test fun `cada login genera un sessionId nuevo`() = runTest {
        repo.login("ana@test.com", "Secreta123")
        val first = store.current()!!.sessionId
        repo.login("ana@test.com", "Secreta123")
        val second = store.current()!!.sessionId
        assertTrue(first.isNotBlank())
        assertNotEquals(first, second)
    }

    @Test fun `login de entrenador guarda rol TRAINER`() = runTest {
        api.loginResponse = api.loginResponse.copy(user = UserDto("t1", "Pablo", "p@test.com", "trainer"))
        repo.login("p@test.com", "Secreta123")
        assertEquals(Role.TRAINER, store.current()?.user?.role)
    }

    @Test fun `401 es credenciales invalidas y no guarda nada`() = runTest {
        api.loginError = httpError(401)
        val result = repo.login("ana@test.com", "mala")
        assertEquals(DataError.InvalidCredentials, result.dataError())
        assertNull(store.current())
    }

    @Test fun `sin red es Offline`() = runTest {
        api.loginError = IOException("sin red")
        assertEquals(DataError.Offline, repo.login("ana@test.com", "x").dataError())
    }

    @Test fun `500 es Http 500`() = runTest {
        api.loginError = httpError(500)
        assertEquals(DataError.Http(500), repo.login("ana@test.com", "x").dataError())
    }

    // Review Focus 1: rol desconocido -> Unknown, sin sesión a medias.
    @Test fun `rol desconocido es Unknown y no guarda nada`() = runTest {
        api.loginResponse = api.loginResponse.copy(user = UserDto("x", "X", "x@test.com", "admin"))
        val result = repo.login("x@test.com", "Secreta123")
        assertEquals(DataError.Unknown, result.dataError())
        assertNull(store.current())
    }

    @Test fun `falla al guardar la sesion es Unknown, no Offline`() = runTest {
        store.saveError = IOException("disco")
        assertEquals(DataError.Unknown, repo.login("ana@test.com", "Secreta123").dataError())
    }
}
