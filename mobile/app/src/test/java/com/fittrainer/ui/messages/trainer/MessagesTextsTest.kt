package com.fittrainer.ui.messages.trainer

import com.fittrainer.data.messages.trainer.LastMessage
import com.fittrainer.data.messages.trainer.Message
import com.fittrainer.ui.messages.trainer.chat.ChatRow
import com.fittrainer.ui.messages.trainer.chat.chatRows
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class MessagesTextsTest {
    private val zone = ZoneId.of("America/Argentina/Buenos_Aires")
    private val now = Instant.parse("2026-11-01T18:00:00Z") // 15:00 en Argentina
    private fun last(body: String?, mine: Boolean = false, image: Boolean = false) = LastMessage(body, image, mine, now)

    @Test fun laVistaPreviaDiceQuienLoMandoYMuestraLaFoto() {
        assertEquals(NO_MESSAGES_YET, previewOf(null))
        assertEquals("Dale, mañana lo hago", previewOf(last("Dale,\n  mañana lo hago")))
        assertEquals("Vos: Bien ahí", previewOf(last("Bien ahí", mine = true)))
        assertEquals(PHOTO, previewOf(last(null, image = true)))
        assertEquals("Vos: $PHOTO", previewOf(last("   ", mine = true, image = true)))
    }

    @Test fun laHoraDeLaListaEsHoraAyerOFechaEnLaZonaDelCelular() {
        assertEquals("14:05", listTime(Instant.parse("2026-11-01T17:05:00Z"), now, zone))
        // 01:30 UTC del 1/11 todavía es 31/10 en Argentina.
        assertEquals("ayer", listTime(Instant.parse("2026-11-01T01:30:00Z"), now, zone))
        assertEquals("28/10", listTime(Instant.parse("2026-10-28T12:00:00Z"), now, zone))
    }

    @Test fun losSeparadoresDeDia() {
        val today = LocalDate.of(2026, 11, 1)
        assertEquals("HOY", dayLabel(today, today))
        assertEquals("AYER", dayLabel(today.minusDays(1), today))
        assertEquals("29/10", dayLabel(LocalDate.of(2026, 10, 29), today))
    }

    @Test fun losBotonesYResumenesDeLaDifusion() {
        assertEquals("Elegí a quién mandarle", broadcastButton(0))
        assertEquals("Enviar a 1 alumno", broadcastButton(1))
        assertEquals("Enviar a 3 alumnos", broadcastButton(3))
        assertEquals("Enviado a 1 alumno", broadcastSent(1))
        assertEquals("Enviado a 2 alumnos", broadcastSent(2))
        assertEquals("1 mensaje sin leer", unreadDescription(1))
    }

    @Test fun elChatPoneUnSeparadorAntesDelPrimerMensajeDeCadaDia() {
        fun m(id: String, iso: String) = Message(id, false, id, null, false, false, Instant.parse(iso))
        val rows = chatRows(listOf(m("a", "2026-10-31T20:00:00Z"), m("b", "2026-10-31T21:00:00Z"), m("c", "2026-11-01T13:00:00Z")), zone)
        assertEquals(
            listOf("day-2026-10-31", "a", "b", "day-2026-11-01", "c"),
            rows.map { it.key },
        )
        assertEquals(LocalDate.of(2026, 10, 31), (rows[0] as ChatRow.Day).day)
    }
}
