package com.fittrainer.data.auth.authrepository

import com.fittrainer.data.api.RegisterStudentRequest
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Role
import com.fittrainer.testing.fakes.TOKEN
import com.fittrainer.testing.fakes.auth.FakeAuthApi
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.auth.fixedClock
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AuthRepositoryRegisterTest {

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val repo = AuthRepository(api, store, fixedClock())

    private fun Result<*>.dataError() = (exceptionOrNull() as DataException).error

    @Test fun `alta ok guarda sesion de alumno con los dos tokens`() = runTest {
        val result = repo.registerFromInvitation(TOKEN, "Secreta123")

        val expected = AuthUser("s1", "Tomás Rivera", "tomas@test.com", Role.STUDENT)
        assertEquals(expected, result.getOrNull())
        val saved = store.current()!!
        assertEquals("access-s", saved.accessToken)
        assertEquals("refresh-s", saved.refreshToken)
        assertEquals(expected, saved.user)
        assertEquals(listOf(RegisterStudentRequest(TOKEN, "Secreta123")), api.registerCalls)
    }

    @Test fun `alta con email existente es StudentEmailExists y no guarda`() = runTest {
        api.registerError = apiError(409, "STUDENT_EMAIL_EXISTS")
        assertEquals(DataError.StudentEmailExists, repo.registerFromInvitation(TOKEN, "Secreta123").dataError())
        assertNull(store.current())
    }

    @Test fun `alta con invitacion usada es InvitationUsed`() = runTest {
        api.registerError = apiError(410, "INVITATION_ALREADY_USED")
        assertEquals(DataError.InvitationUsed, repo.registerFromInvitation(TOKEN, "Secreta123").dataError())
    }

    @Test fun `alta sin red es Offline`() = runTest {
        api.registerError = IOException("sin red")
        assertEquals(DataError.Offline, repo.registerFromInvitation(TOKEN, "Secreta123").dataError())
    }

    @Test fun `alta ok pero falla el guardado es Unknown`() = runTest {
        store.saveError = IOException("disco lleno")
        assertEquals(DataError.Unknown, repo.registerFromInvitation(TOKEN, "Secreta123").dataError())
    }
}
