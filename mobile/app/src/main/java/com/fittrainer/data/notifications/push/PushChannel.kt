package com.fittrainer.data.notifications.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context

/** Canal de los avisos del entrenador. El id también está en el manifest (canal por defecto de FCM). */
object PushChannel {
    const val ID = "student_notices"

    /** Lo que ve el usuario en Ajustes del sistema. */
    const val NAME = "Avisos de tu entrenador"

    /** Idempotente: crear un canal que ya existe no hace nada. */
    fun create(context: Context) {
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(ID, NAME, NotificationManager.IMPORTANCE_DEFAULT),
        )
    }
}
