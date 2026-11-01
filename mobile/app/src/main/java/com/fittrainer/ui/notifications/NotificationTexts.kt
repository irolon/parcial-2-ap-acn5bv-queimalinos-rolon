package com.fittrainer.ui.notifications

import com.fittrainer.ui.progress.charts.ChartsTexts
import java.time.Duration
import java.time.Instant
import java.time.ZoneId

/** Textos de la lista de avisos y la campana. Siempre en es-AR. */
object NotificationTexts {
    const val TITLE = "Avisos"
    const val MARK_ALL_READ = "Marcar todo leído"
    const val EMPTY = "Todavía no tenés avisos"
    const val EMPTY_HINT = "Acá vas a ver los comentarios de tu entrenador, tus récords y tus logros"
    const val OFFLINE = "Sin conexión · mostrando lo guardado"
    const val NEVER_LOADED = "Conectate una vez para ver tus avisos"
    const val REFRESH_FAILED = "No pudimos actualizar"
    const val RETRY = "Reintentar"
    const val PERMISSION_OFF = "Las notificaciones están apagadas"
    const val ACTIVATE = "Activar"

    /** Lo que lee TalkBack en la campana. */
    fun bellDescription(unread: Int): String = when {
        unread <= 0 -> "Avisos"
        unread == 1 -> "Avisos, 1 sin leer"
        else -> "Avisos, $unread sin leer"
    }

    fun groupLabel(group: NotificationGroup): String = when (group) {
        NotificationGroup.TODAY -> "Hoy"
        NotificationGroup.YESTERDAY -> "Ayer"
        NotificationGroup.EARLIER -> "Antes"
    }

    /** "" sin no leídos, el número hasta 9 y "9+" si pasa de 9. */
    fun badge(unread: Int): String = when {
        unread <= 0 -> ""
        unread > 9 -> "9+"
        else -> unread.toString()
    }

    /** "ahora", "hace N min", "hace N h" (hoy), "ayer" o "25 oct". El día se decide en la zona dada. */
    fun relativeTime(at: Instant, now: Instant, zone: ZoneId): String {
        val day = at.atZone(zone).toLocalDate()
        val today = now.atZone(zone).toLocalDate()
        val elapsed = Duration.between(at, now)
        return when {
            day == today.minusDays(1) -> "ayer"
            day.isBefore(today) -> ChartsTexts.formatShortDate(day)
            elapsed.toMinutes() < 1 -> "ahora"
            elapsed.toMinutes() < 60 -> "hace ${elapsed.toMinutes()} min"
            else -> "hace ${elapsed.toHours()} h"
        }
    }
}
