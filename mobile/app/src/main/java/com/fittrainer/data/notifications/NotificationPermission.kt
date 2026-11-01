package com.fittrainer.data.notifications

import android.content.Context
import androidx.core.app.NotificationManagerCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

/** ¿El alumno tiene prendidas las notificaciones de la app? Es una interfaz para poder probar el cartel sin Android. */
interface NotificationPermission {
    fun enabled(): Boolean
}

class AndroidNotificationPermission @Inject constructor(
    @param:ApplicationContext private val context: Context,
) : NotificationPermission {
    override fun enabled(): Boolean = NotificationManagerCompat.from(context).areNotificationsEnabled()
}
