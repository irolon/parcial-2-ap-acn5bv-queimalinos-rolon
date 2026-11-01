package com.fittrainer.data.db.notifications

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Estado de la lista de notificaciones de un dueño (tarjeta 17), en Room para escribirse en la misma
 * transacción que las filas. [everLoaded]: algún refresco terminó bien. [nextBefore]: cursor de "Ver más", el del
 * tramo bajado de corrido desde la página 1 (no se deduce de las filas guardadas).
 */
@Entity(tableName = "notifications_meta")
data class NotificationMetaEntity(
    @PrimaryKey val ownerId: String,
    val everLoaded: Boolean = false,
    val nextBefore: String? = null,
)
