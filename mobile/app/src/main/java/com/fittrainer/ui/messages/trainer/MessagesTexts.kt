package com.fittrainer.ui.messages.trainer

import com.fittrainer.data.messages.trainer.LastMessage
import com.fittrainer.data.messages.trainer.MAX_BROADCAST
import com.fittrainer.data.messages.trainer.MAX_MESSAGE_LENGTH
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

const val MESSAGES_TITLE = "Mensajes"
const val MESSAGES_BROADCAST = "Difusión"
const val MESSAGES_EMPTY = "Todavía no tenés alumnos activos. Cuando invites a uno, vas a poder escribirle acá."
const val MESSAGES_ERROR_TITLE = "No pudimos cargar tus mensajes"
const val MESSAGES_REFRESH_FAILED = "No pudimos actualizar. Mostrando lo último guardado"
const val MESSAGES_RETRY = "Reintentar"
const val NO_MESSAGES_YET = "Sin mensajes todavía"
const val PHOTO = "📷 Foto"
const val COMPOSER_HINT = "Mensaje…"
const val SEND = "Enviar"
const val SEND_FAILED = "No se pudo enviar. Probá de nuevo"
const val SEND_OFFLINE = "Sin conexión: conectate para escribir"
const val STUDENT_INACTIVE_HINT = "El alumno está dado de baja"
const val CHAT_GONE = "Este alumno ya no está en tu lista"
const val CHAT_EMPTY = "Todavía no se escribieron. Mandale el primer mensaje."
const val CHAT_LOADING_FAILED = "No pudimos cargar la conversación"
const val LOAD_OLDER = "Ver anteriores"
const val BROADCAST_TAG = "DIFUSIÓN"
const val BROADCAST_TITLE = "Mensaje de difusión"
const val BROADCAST_ALL = "Todos"
const val BROADCAST_HINT = "Escribí el mensaje para todos los elegidos"
const val BROADCAST_FAILED = "No se pudo enviar la difusión. Probá de nuevo"
const val BROADCAST_STALE = "Alguno de los elegidos ya no es alumno activo. Actualizamos la lista: elegí de nuevo"
const val BROADCAST_TOO_MANY = "Podés mandar a $MAX_BROADCAST alumnos por vez"
const val MESSAGE_TOO_LONG = "Hasta $MAX_MESSAGE_LENGTH caracteres"

/** El contador aparece al acercarse al tope. */
const val COUNTER_FROM = 1800

private val HOUR = DateTimeFormatter.ofPattern("HH:mm")
private val DAY = DateTimeFormatter.ofPattern("dd/MM")

/** La vista previa de una fila: "Vos: …" si lo mandó el PT, la foto si no hubo texto. */
fun previewOf(last: LastMessage?): String {
    if (last == null) return NO_MESSAGES_YET
    val text = last.body?.trim()?.replace(Regex("\\s+"), " ")?.takeIf { it.isNotEmpty() } ?: PHOTO
    return if (last.fromTrainer) "Vos: $text" else text
}

/** Hora de la fila: HH:mm hoy, "ayer", dd/MM antes. */
fun listTime(at: Instant, now: Instant, zone: ZoneId): String {
    val day = at.atZone(zone).toLocalDate()
    val today = now.atZone(zone).toLocalDate()
    return when (day) {
        today -> HOUR.format(at.atZone(zone))
        today.minusDays(1) -> "ayer"
        else -> DAY.format(at.atZone(zone))
    }
}

/** Hora de una burbuja. */
fun bubbleTime(at: Instant, zone: ZoneId): String = HOUR.format(at.atZone(zone))

/** El separador de día del chat: HOY, AYER o la fecha. */
fun dayLabel(day: LocalDate, today: LocalDate): String = when (day) {
    today -> "HOY"
    today.minusDays(1) -> "AYER"
    else -> DAY.format(day)
}

fun unreadDescription(count: Int): String = if (count == 1) "1 mensaje sin leer" else "$count mensajes sin leer"

fun broadcastButton(count: Int): String = when (count) {
    0 -> "Elegí a quién mandarle"
    1 -> "Enviar a 1 alumno"
    else -> "Enviar a $count alumnos"
}

fun broadcastSent(count: Int): String = if (count == 1) "Enviado a 1 alumno" else "Enviado a $count alumnos"
