package com.fittrainer.data.db.notifications

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Una notificación del servidor guardada por dueño (tarjeta 17). Room es la fuente de verdad de la lista.
 * Las lecturas sin subir no viven acá sino en [NotificationPendingReadEntity]: esta fila se puede borrar y volver.
 */
@Entity(tableName = "notifications", indices = [Index(value = ["ownerId", "createdAt"])])
data class NotificationEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val type: String,
    val title: String,
    val body: String?,
    /** El objeto `data` del servidor, serializado como JSON. */
    val dataJson: String,
    val read: Boolean,
    /** Epoch ms de `created_at`. */
    val createdAt: Long,
)
