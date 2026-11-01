package com.fittrainer.data.notifications

import com.fittrainer.data.api.notifications.NotificationDto
import java.time.Instant
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationMapperTest {
    private fun dto(type: String = "pr", data: String = "{}", at: String = "2026-10-30T06:00:00.123456+00:00") =
        NotificationDto("n1", type, "t", null, Json.parseToJsonElement(data) as JsonObject, false, at)

    @Test fun soloGuardaLosTiposDelAlumno() {
        val saved = listOf("comment", "pr", "achievement", "inactivity", "otro").map { dto(it).toEntity("u1") != null }
        assertEquals(listOf(true, true, true, false, false), saved)
    }

    @Test fun fechaConZYConOffsetDanElMismoInstante() {
        val z = dto(at = "2026-10-30T06:00:00Z").toEntity("u1")!!.createdAt
        assertEquals(z, dto(at = "2026-10-30T06:00:00+00:00").toEntity("u1")!!.createdAt)
    }

    @Test fun fechaRotaDevuelveNull() {
        assertNull(dto(at = "ayer").toEntity("u1"))
    }

    @Test fun losValoresDeDataSonTextoYLosArraysQuedanEnJson() {
        val model = dto(data = """{"session_id":"s1","n":3,"ids":["a","b"]}""").toEntity("u1")!!.toModel()!!
        assertEquals(mapOf("session_id" to "s1", "n" to "3", "ids" to """["a","b"]"""), model.data)
        assertEquals(NotificationType.PR, model.type)
        assertEquals(Instant.parse("2026-10-30T06:00:00.123Z"), model.createdAt)
    }

    @Test fun tipoDesconocidoNoSeConvierteAModelo() {
        assertNull(dto().toEntity("u1")!!.copy(type = "inactivity").toModel())
    }
}
