package com.fittrainer.data.api.account

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Las respuestas reales del backend (develop, #94 y #95) se leen con los DTO del perfil. */
class ProfileDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun laFichaDelPropioAlumnoTraeEmailTelefonoYFotoFirmada() {
        // GET /students/:id y PATCH /students/:id → { data: buildDetail(...) }.
        val body = """{"data":{"id":"u1","trainer_id":"t1","name":"Ana","email":"ana@mail.com","goal":null,
            "birth_date":null,"avatar_url":"https://s/a.jpg?token=1","active":true,"gym_equipment":null,"injuries":null,
            "level":null,"created_at":"2026-11-01T00:00:00Z","must_change_password":false,"password_changed_at":null,
            "phone":"11 5555 5555","latest_metrics":null,"active_routine":null,"last_session_at":null}}"""
        val dto = json.decodeFromString<ProfileResponse>(body).data
        assertEquals("ana@mail.com", dto.email)
        assertEquals("11 5555 5555", dto.phone)
        assertEquals("https://s/a.jpg?token=1", dto.avatarUrl)
        assertNull(dto.professionalTitle)
    }

    @Test fun elPerfilDelEntrenadorTraeElTituloONull() {
        // GET /auth/me y PATCH /auth/me → { data: toProfile(...) }.
        val body = """{"data":{"id":"t1","name":"Profe","email":"p@mail.com","specialty":null,"professional_title":null,
            "avatar_url":null,"password_changed_at":null,"created_at":"2026-11-01T00:00:00Z"}}"""
        val dto = json.decodeFromString<ProfileResponse>(body).data
        assertNull(dto.professionalTitle)
        assertNull(dto.avatarUrl)
        assertNull(dto.phone)
    }

    @Test fun laFotoNuevaYElCambioDeClave() {
        // PUT /students/:id/avatar → { data: { avatar_url } }; con Storage caído, avatar_url null.
        assertNull(json.decodeFromString<AvatarResponse>("""{"data":{"avatar_url":null}}""").data.avatarUrl)
        // PUT /auth/password → { token, expires_in, password_changed_at }, sin envoltorio data.
        val pw = """{"token":"access-2","expires_in":"1h","password_changed_at":"2026-11-13T10:00:00Z"}"""
        assertEquals("access-2", json.decodeFromString<ChangePasswordResponse>(pw).token)
    }

    @Test fun elBodyDelCambioDeClaveUsaLosNombresDelBackendYSinPushNoMandaElCampo() {
        // Mismo Json que Retrofit (NetworkModule): los valores por defecto (push_token null) no se mandan.
        assertEquals(
            """{"current_password":"Vieja1","new_password":"Nueva1","refresh_token":"r1"}""",
            json.encodeToString(ChangePasswordRequest.serializer(), ChangePasswordRequest("Vieja1", "Nueva1", "r1")),
        )
    }
}
