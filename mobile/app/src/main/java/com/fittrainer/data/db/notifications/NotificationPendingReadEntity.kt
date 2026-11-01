package com.fittrainer.data.db.notifications

import androidx.room.Entity

/**
 * Un "leído" que el alumno marcó y todavía no subió (tarjeta 17). Tabla aparte de las filas cacheadas: la marca
 * sobrevive aunque la notificación no esté guardada (push tocado con la app cerrada) o la borre un refresco.
 */
@Entity(tableName = "notification_pending_reads", primaryKeys = ["ownerId", "notificationId"])
data class NotificationPendingReadEntity(
    val ownerId: String,
    val notificationId: String,
)
