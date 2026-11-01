package com.fittrainer.ui.notifications

import java.time.Instant
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationTextsTest {
    private val zone = ZoneId.of("America/Argentina/Buenos_Aires")
    private val now = Instant.parse("2026-10-31T15:00:00Z")

    private fun rel(at: String) = NotificationTexts.relativeTime(Instant.parse(at), now, zone)

    @Test fun tiempoRelativo() {
        assertEquals("ahora", rel("2026-10-31T14:59:30Z"))
        assertEquals("hace 5 min", rel("2026-10-31T14:55:00Z"))
        assertEquals("hace 3 h", rel("2026-10-31T12:00:00Z"))
        assertEquals("ayer", rel("2026-10-30T15:00:00Z"))
        assertEquals("25 oct", rel("2026-10-25T15:00:00Z"))
    }

    @Test fun unaHoraExactaEsHaceUnaHora() {
        assertEquals("hace 1 h", rel("2026-10-31T14:00:00Z"))
        assertEquals("hace 59 min", rel("2026-10-31T14:01:00Z"))
    }

    @Test fun elFuturoCuentaComoAhora() {
        assertEquals("ahora", rel("2026-10-31T15:05:00Z"))
    }

    @Test fun ayerSeDecideEnHoraDeArgentina() {
        // 02:59Z del 31/10 es de ayer en Buenos Aires, aunque hayan pasado solo 12 h.
        assertEquals("ayer", rel("2026-10-31T02:59:00Z"))
    }

    @Test fun badgeNueveMas() {
        assertEquals("", NotificationTexts.badge(0))
        assertEquals("1", NotificationTexts.badge(1))
        assertEquals("9", NotificationTexts.badge(9))
        assertEquals("9+", NotificationTexts.badge(10))
        assertEquals("9+", NotificationTexts.badge(250))
    }

    @Test fun etiquetasDeGrupos() {
        assertEquals("Hoy", NotificationTexts.groupLabel(NotificationGroup.TODAY))
        assertEquals("Ayer", NotificationTexts.groupLabel(NotificationGroup.YESTERDAY))
        assertEquals("Antes", NotificationTexts.groupLabel(NotificationGroup.EARLIER))
    }
}
