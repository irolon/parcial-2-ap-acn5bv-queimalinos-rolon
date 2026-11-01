package com.fittrainer.data.api.notifications

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun parseaLaRespuestaReal() {
        val body = """{
          "data": [ {
            "id": "n1", "type": "comment", "title": "Tu profe comentó", "body": null,
            "data": { "session_id": "s1" }, "read": false,
            "created_at": "2026-10-30T06:00:00.123456+00:00"
          } ],
          "meta": { "unread_count": 3, "next_before": null }
        }"""
        val page = json.decodeFromString(NotificationPageDto.serializer(), body)
        assertEquals("s1", page.data[0].data["session_id"]!!.jsonPrimitive.content)
        assertNull(page.data[0].body)
        assertFalse(page.data[0].read)
        assertEquals("2026-10-30T06:00:00.123456+00:00", page.data[0].createdAt)
        assertEquals(3, page.meta.unreadCount)
        assertNull(page.meta.nextBefore)
    }

    // Mismo Json que provee NetworkModule (sin encodeDefaults).
    @Test fun elTokenSerializaConLaPlataformaPorDefecto() {
        val encoded = json.encodeToString(PushTokenDto.serializer(), PushTokenDto("abc"))
        assertEquals("""{"token":"abc","platform":"android"}""", encoded)
    }
}
