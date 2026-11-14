package com.fittrainer.data.api

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** GX1-M1: `must_change_password` en el login y el refresh, con y sin el campo (backend viejo). */
class AuthApiDtoTest {

    private val json = Json { ignoreUnknownKeys = true }
    private val user = """"id":"u1","name":"Ana","email":"ana@test.com","role":"student""""

    @Test fun `el login trae la marca`() {
        val body = """{"user":{$user,"must_change_password":true},"token":"a","refresh_token":"r"}"""
        assertTrue(json.decodeFromString<LoginResponse>(body).user.mustChangePassword)
    }

    @Test fun `un login sin el campo la deja en false`() {
        val body = """{"user":{$user},"token":"a","refresh_token":"r"}"""
        assertFalse(json.decodeFromString<LoginResponse>(body).user.mustChangePassword)
    }

    @Test fun `el refresh trae la marca o null si no viene`() {
        assertEquals(true, json.decodeFromString<RefreshResponse>("""{"token":"a","must_change_password":true}""").mustChangePassword)
        assertEquals(false, json.decodeFromString<RefreshResponse>("""{"token":"a","must_change_password":false}""").mustChangePassword)
        assertNull(json.decodeFromString<RefreshResponse>("""{"token":"a"}""").mustChangePassword)
    }
}
