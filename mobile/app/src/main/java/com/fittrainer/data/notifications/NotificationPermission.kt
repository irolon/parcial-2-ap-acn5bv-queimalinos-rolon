package com.fittrainer.data.notifications

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.fittrainer.data.notifications.push.PushChannel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

/** ¿El alumno tiene prendidas las notificaciones de la app? Es una interfaz para poder probar el cartel sin Android. */
interface NotificationPermission {
    fun enabled(): Boolean
}

/** En Android 13+ hace falta el permiso; antes, alcanza con que el usuario no las haya apagado. La usan también la sesión activa y su servicio. */
fun notificationsAllowed(context: Context): Boolean =
    (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
        NotificationManagerCompat.from(context).areNotificationsEnabled()

/** El canal "Avisos de tu entrenador" no está apagado solo (si todavía no existe, cuenta como prendido). */
fun pushChannelEnabled(context: Context): Boolean =
    NotificationManagerCompat.from(context).getNotificationChannel(PushChannel.ID)?.importance != NotificationManager.IMPORTANCE_NONE

/** Prendidas = la app puede notificar y el canal de los avisos no está apagado (areNotificationsEnabled no lo ve). */
class AndroidNotificationPermission @Inject constructor(
    @param:ApplicationContext private val context: Context,
) : NotificationPermission {
    override fun enabled(): Boolean = notificationsAllowed(context) && pushChannelEnabled(context)
}
