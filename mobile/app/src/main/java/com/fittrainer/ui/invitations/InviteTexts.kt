package com.fittrainer.ui.invitations

import java.time.Duration
import java.time.Instant

const val INVITE_TITLE = "Invitar alumno"
const val INVITE_SUBMIT = "Generar invitación"
const val INVITE_NEEDS_NETWORK = "Necesitás conexión para invitar"
const val INVITE_NETWORK_FAILED = "No pudimos generar la invitación. Revisá la conexión y probá de nuevo."
const val INVITE_SERVER_FAILED = "No pudimos generar la invitación. Probá de nuevo en un rato."
const val INVITE_MORE = "Más datos"
const val INVITE_WHATSAPP = "Enviar por WhatsApp"
const val INVITE_SHARE = "Compartir link"
const val INVITE_ANOTHER = "Invitar a otro"

/** Etiquetas de los niveles del backend. */
fun levelLabel(level: String?): String = when (level) {
    null -> "Sin definir"
    "beginner" -> "Principiante"
    "intermediate" -> "Intermedio"
    "advanced" -> "Avanzado"
    else -> level
}

/** "VÁLIDO 47H": horas que faltan para el vencimiento, redondeadas hacia abajo. */
fun expiryText(expiresAt: Instant, now: Instant): String {
    val hours = Duration.between(now, expiresAt).toHours().coerceAtLeast(0)
    return if (hours == 0L) "VENCE EN MENOS DE 1H" else "VÁLIDO ${hours}H"
}

/** "Pedro escanea y entra" (primer nombre). */
fun scanText(studentName: String): String = "${studentName.trim().substringBefore(' ')} escanea y entra"

/** El link sin el esquema, para mostrarlo corto. */
fun shortLink(joinUrl: String): String = joinUrl.substringAfter("://")

/** Texto para compartir cuando no hay link de WhatsApp. */
fun shareText(studentName: String, joinUrl: String): String =
    "¡Hola ${studentName.trim().substringBefore(' ')}! Te invito a entrenar conmigo en FitTrainer. " +
        "Creá tu cuenta desde este link: $joinUrl"
