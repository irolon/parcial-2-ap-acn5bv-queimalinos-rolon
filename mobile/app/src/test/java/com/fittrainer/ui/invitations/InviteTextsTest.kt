package com.fittrainer.ui.invitations

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class InviteTextsTest {

    private val now = Instant.parse("2026-11-01T12:00:00Z")

    @Test fun `vencimiento en horas redondeadas hacia abajo`() {
        assertEquals("VÁLIDO 48H", expiryText(now.plusSeconds(48 * 3600), now))
        assertEquals("VÁLIDO 47H", expiryText(now.plusSeconds(48 * 3600 - 60), now))
        assertEquals("VENCE EN MENOS DE 1H", expiryText(now.plusSeconds(1800), now))
    }

    @Test fun `textos con el primer nombre y link corto`() {
        assertEquals("Pedro escanea y entra", scanText("Pedro Gómez"))
        assertEquals("fittrainer.app/join?token=a", shortLink("https://fittrainer.app/join?token=a"))
        assertTrue(shareText("Pedro Gómez", "https://x/join").startsWith("¡Hola Pedro!"))
        assertTrue(shareText("Pedro Gómez", "https://x/join").endsWith("https://x/join"))
    }

    @Test fun `etiquetas de nivel`() {
        assertEquals("Principiante", levelLabel("beginner"))
        assertEquals("Sin definir", levelLabel(null))
    }
}
