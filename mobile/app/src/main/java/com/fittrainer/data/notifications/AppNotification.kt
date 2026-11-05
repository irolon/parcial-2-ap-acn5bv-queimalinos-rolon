package com.fittrainer.data.notifications

import java.time.Instant

/**
 * Tipos que muestra la app: los del alumno (comment, pr, achievement) y los del entrenador (E12: inactivity,
 * routine_modified, y también pr y achievement de sus alumnos). appointment (E13) es de los dos: al PT le avisa que
 * un alumno pidió o canceló un turno; al alumno, lo que hizo el PT. El servidor solo manda los del usuario logueado;
 * los que no están acá se descartan.
 */
enum class NotificationType(val wire: String) {
    COMMENT("comment"),
    PR("pr"),
    ACHIEVEMENT("achievement"),
    INACTIVITY("inactivity"),
    ROUTINE_MODIFIED("routine_modified"),
    APPOINTMENT("appointment"),
    ;

    companion object {
        fun fromWire(value: String): NotificationType? = entries.firstOrNull { it.wire == value }
    }
}

/** Una notificación lista para la UI. `data` son textos; los arrays vienen serializados en JSON, igual que en el push. */
data class AppNotification(
    val id: String,
    val type: NotificationType,
    val title: String,
    val body: String?,
    val data: Map<String, String>,
    val read: Boolean,
    val createdAt: Instant,
)
