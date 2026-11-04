package com.fittrainer.ui.messages.trainer.chat

import com.fittrainer.data.messages.trainer.Message
import java.time.LocalDate
import java.time.ZoneId

/** Una fila del chat: el separador de un día o una burbuja. */
sealed interface ChatRow {
    val key: String

    data class Day(val day: LocalDate) : ChatRow {
        override val key = "day-$day"
    }

    data class Bubble(val message: Message) : ChatRow {
        override val key = message.id
    }
}

/** Los mensajes en orden con un separador antes del primero de cada día (en la zona del celular). */
fun chatRows(messages: List<Message>, zone: ZoneId): List<ChatRow> = buildList {
    var current: LocalDate? = null
    for (m in messages) {
        val day = m.at.atZone(zone).toLocalDate()
        if (day != current) {
            add(ChatRow.Day(day))
            current = day
        }
        add(ChatRow.Bubble(m))
    }
}
