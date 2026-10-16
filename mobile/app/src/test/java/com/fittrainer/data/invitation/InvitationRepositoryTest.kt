package com.fittrainer.data.invitation

import com.fittrainer.data.FakeInvitationApi
import com.fittrainer.data.TOKEN
import com.fittrainer.data.apiError
import com.fittrainer.data.httpError
import com.fittrainer.data.invitationDto
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class InvitationRepositoryTest {

    private val api = FakeInvitationApi()
    private val repo = InvitationRepository(api)

    private fun Result<*>.dataError() = (exceptionOrNull() as DataException).error

    // Review Focus 1: formato real de Supabase (offset +00:00 y microsegundos).
    @Test fun `200 mapea la invitacion con la fecha de Supabase`() = runTest {
        val result = repo.get(TOKEN)
        assertEquals(
            Invitation("Laura", "Tomás Rivera", "tomas@test.com", "hypertrophy", Instant.parse("2026-10-17T12:00:00.123456Z")),
            result.getOrNull(),
        )
        assertEquals(listOf(TOKEN), api.calls)
    }

    @Test fun `fecha con Z tambien parsea`() = runTest {
        api.response = invitationDto(expiresAt = "2026-10-17T12:00:00Z")
        assertEquals(Instant.parse("2026-10-17T12:00:00Z"), repo.get(TOKEN).getOrNull()?.expiresAt)
    }

    @Test fun `404 es InvitationNotFound`() = runTest {
        api.error = apiError(404, "INVITATION_NOT_FOUND")
        assertEquals(DataError.InvitationNotFound, repo.get(TOKEN).dataError())
    }

    @Test fun `410 vencida es InvitationExpired`() = runTest {
        api.error = apiError(410, "INVITATION_EXPIRED")
        assertEquals(DataError.InvitationExpired, repo.get(TOKEN).dataError())
    }

    @Test fun `410 usada es InvitationUsed`() = runTest {
        api.error = apiError(410, "INVITATION_ALREADY_USED")
        assertEquals(DataError.InvitationUsed, repo.get(TOKEN).dataError())
    }

    // Review Focus 4: body que no es JSON.
    @Test fun `410 con body ilegible es Http 410`() = runTest {
        api.error = httpError(410, "<html>Gone</html>")
        assertEquals(DataError.Http(410), repo.get(TOKEN).dataError())
    }

    @Test fun `sin red es Offline`() = runTest {
        api.error = IOException("sin red")
        assertEquals(DataError.Offline, repo.get(TOKEN).dataError())
    }

    @Test fun `fecha invalida es Unknown`() = runTest {
        api.response = invitationDto(expiresAt = "mañana")
        assertEquals(DataError.Unknown, repo.get(TOKEN).dataError())
    }
}
