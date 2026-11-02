package com.fittrainer.data.invitation.invite

import com.fittrainer.data.repository.DataError
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.invitation.FakeTrainerInvitationApi
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InviteRepositoryTest {

    private val api = FakeTrainerInvitationApi()
    private val repo = InviteRepository(api)
    private val form = InviteForm(name = "Pedro", email = "pedro@mail.com", phone = "1133334444")

    @Test fun `201 devuelve la invitacion con el QR decodificado`() = runTest {
        val result = repo.create(form) as InviteResult.Created
        assertEquals("http://localhost:5173/join?token=abc", result.invitation.joinUrl)
        assertNotNull(result.invitation.qrPng)
        assertEquals("https://wa.me/5491133334444?text=Hola", result.invitation.whatsappUrl)
        assertEquals(Instant.parse("2026-11-03T12:00:00.123Z"), result.invitation.expiresAt)
        assertEquals("both", api.requests.single().deliveryChannel)
    }

    @Test fun `un QR roto no impide mostrar la invitacion`() = runTest {
        api.qr = "data:image/png;base64,%%%"
        val result = repo.create(form) as InviteResult.Created
        assertNull(result.invitation.qrPng)
    }

    @Test fun `400 con details marca el campo`() = runTest {
        api.error = httpError(
            400,
            """{"error":{"code":"VALIDATION_ERROR","message":"Error de validación","details":[{"field":"student_phone","message":"Teléfono inválido"}]}}""",
        )
        val result = repo.create(form) as InviteResult.Rejected
        assertEquals(mapOf(InviteField.PHONE to "Teléfono inválido"), result.fields)
    }

    @Test fun `409 email existente marca el email`() = runTest {
        api.error = apiError(409, "STUDENT_EMAIL_EXISTS")
        val result = repo.create(form) as InviteResult.Rejected
        assertTrue(InviteField.EMAIL in result.fields)
    }

    @Test fun `sin red es Offline`() = runTest {
        api.error = IOException("sin red")
        assertEquals(InviteResult.Failed(DataError.Offline), repo.create(form))
    }

    @Test fun `500 es un error HTTP`() = runTest {
        api.error = apiError(500, "INTERNAL")
        assertEquals(InviteResult.Failed(DataError.Http(500)), repo.create(form))
    }
}
