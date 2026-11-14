package com.fittrainer.data.account

import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Role
import com.fittrainer.testing.fakes.auth.FakeTokenStore
import com.fittrainer.testing.fakes.auth.authState
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.notifications.FakeFcmTokenSource
import com.fittrainer.testing.fakes.account.FakeMyProfileDao
import com.fittrainer.testing.fakes.account.FakeProfileApi
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileRepositoryTest {
    private val api = FakeProfileApi()
    private val dao = FakeMyProfileDao()
    private val tokens = FakeTokenStore(authState())
    private val fcm = FakeFcmTokenSource()
    private val clock = Clock.fixed(Instant.parse("2026-11-11T22:00:00Z"), ZoneOffset.UTC)
    private val repo = ProfileRepository(api, dao, tokens, fcm, clock)

    @Test fun refrescarAlumnoGuardaSusDatosYSuFotoConElDueño() = runTest {
        assertTrue(repo.refresh("u1", Role.STUDENT).isSuccess)
        val p = repo.observe("u1").first()!!
        assertEquals("11 5555 5555", p.phone)
        assertEquals("https://x/a.jpg?sig=1", p.avatarUrl)
        assertEquals(Role.STUDENT, p.role)
        assertEquals(listOf(RequiredUser("u1")), api.owners)
    }

    @Test fun refrescarEntrenadorGuardaElTituloYNoUnaFotoPropia() = runTest {
        repo.refresh("t1", Role.TRAINER)
        val p = repo.observe("t1").first()!!
        assertEquals("Lic. en Ed. Física", p.professionalTitle)
        assertNull(p.avatarUrl)
    }

    @Test fun editarMandaSoloLoCambiadoVacioComoNullYActualizaElNombreDeLaSesion() = runTest {
        repo.refresh("u1", Role.STUDENT)
        assertTrue(repo.update("u1", Role.STUDENT, mapOf(ProfileField.NAME to "Ana María", ProfileField.PHONE to null)).isSuccess)

        assertEquals(mapOf("name" to JsonPrimitive("Ana María"), "phone" to JsonNull), api.patches.single())
        val p = repo.observe("u1").first()!!
        assertEquals("Ana María", p.name)
        assertNull(p.phone)
        assertEquals("Ana María", tokens.current()!!.user.name)
    }

    @Test fun editarSinCambiarElNombreNoTocaLaSesion() = runTest {
        repo.update("u1", Role.STUDENT, mapOf(ProfileField.PHONE to "11 4444 4444"))
        assertEquals("Ana", tokens.current()!!.user.name)
    }

    @Test fun un400PorCampoLlegaComoErroresPorCampo() = runTest {
        api.error = httpError(400, """{"error":{"code":"VALIDATION_ERROR","message":"Error de validación","details":[{"field":"phone","message":"phone inválido"}]}}""")
        val e = repo.update("u1", Role.STUDENT, mapOf(ProfileField.PHONE to "x")).exceptionOrNull() as FieldErrorsException
        assertEquals(mapOf("phone" to "phone inválido"), e.fields)
    }

    @Test fun sinRedEsOfflineYNoGuardaNada() = runTest {
        api.error = IOException("sin red")
        val e = repo.update("u1", Role.STUDENT, mapOf(ProfileField.NAME to "Ana María")).exceptionOrNull() as DataException
        assertEquals(DataError.Offline, e.error)
        assertNull(repo.observe("u1").first())
    }

    @Test fun fotoNuevaYQuitarlaActualizanRoom() = runTest {
        repo.refresh("u1", Role.STUDENT)
        repo.setAvatar("u1", byteArrayOf(1, 2, 3))
        assertEquals("https://x/nueva.jpg?sig=2", repo.observe("u1").first()!!.avatarUrl)
        repo.removeAvatar("u1")
        assertNull(repo.observe("u1").first()!!.avatarUrl)
        assertEquals(1, api.uploads)
        assertEquals(1, api.removes)
    }

    @Test fun fotoDemasiadoGrandeOTipoInvalidoTienenSuTexto() = runTest {
        api.error = httpError(413)
        assertEquals(AVATAR_TOO_LARGE, repo.setAvatar("u1", byteArrayOf(1)).exceptionOrNull()!!.message)
        api.error = httpError(415)
        assertEquals(AVATAR_TYPE_INVALID, repo.setAvatar("u1", byteArrayOf(1)).exceptionOrNull()!!.message)
    }

    @Test fun cambiarLaClaveMandaElRefreshYElPushYGuardaElTokenNuevo() = runTest {
        assertTrue(repo.changePassword("u1", "Vieja1234", "Nueva1234").isSuccess)
        val sent = api.passwords.single()
        assertEquals("refresh-1", sent.refreshToken)
        assertEquals("fcm-token-1", sent.pushToken)
        assertEquals("access-nuevo", tokens.current()!!.accessToken)
    }

    @Test fun sinTokenDePushLaClaveSeCambiaIgual() = runTest {
        fcm.error = IllegalStateException("sin Play Services")
        assertTrue(repo.changePassword("u1", "Vieja1234", "Nueva1234").isSuccess)
        assertNull(api.passwords.single().pushToken)
    }

    @Test fun claveActualIncorrectaEsErrorDelCampo() = runTest {
        api.error = httpError(400, """{"error":{"message":"Error de validación","details":[{"field":"current_password","message":"La contraseña actual no es correcta"}]}}""")
        val e = repo.changePassword("u1", "Mala1234", "Nueva1234").exceptionOrNull() as FieldErrorsException
        assertEquals("La contraseña actual no es correcta", e.fields["current_password"])
        assertEquals("access-1", tokens.current()!!.accessToken)
    }

    @Test fun cerrarSesionBorraElPerfilYUnaRespuestaTardiaNoLoVuelveAEscribir() = runTest {
        repo.refresh("u1", Role.STUDENT)
        val gate = CompletableDeferred<Unit>().also { api.gate = it }
        val late = async { repo.refresh("u1", Role.STUDENT) }
        runCurrent()
        repo.clearUserData("u1")
        gate.complete(Unit)

        assertTrue(late.await().isFailure)
        assertNull(repo.observe("u1").first())
    }
}
