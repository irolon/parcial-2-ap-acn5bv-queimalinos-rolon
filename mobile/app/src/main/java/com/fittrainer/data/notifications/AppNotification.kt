package com.fittrainer.data.notifications

import java.time.Instant

/** Tipos de notificación que ve el alumno; los demás del servidor (p. ej. de entrenador) se descartan. */
enum class NotificationType(val wire: String) {
    COMMENT("comment"),
    PR("pr"),
    ACHIEVEMENT("achievement"),
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
