package com.fittrainer.data.notifications.push

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.fittrainer.MainActivity
import com.fittrainer.R
import com.fittrainer.data.auth.tokenstore.TokenStore
import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.data.notifications.notificationsAllowed
import com.fittrainer.data.session.Role
import com.fittrainer.di.ApplicationScope
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import java.util.concurrent.atomic.AtomicInteger
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Recibe los push del entrenador. Mostrar la notificación y refrescar Room son dos caminos al mismo
 * destino: si el usuario no toca el push, la lista igual se pone al día.
 */
@AndroidEntryPoint
class FitTrainerMessagingService : FirebaseMessagingService() {

    @Inject lateinit var registry: PushTokenRegistry
    @Inject lateinit var repository: NotificationsRepository
    @Inject lateinit var tokenStore: TokenStore
    @Inject @ApplicationScope lateinit var appScope: CoroutineScope

    override fun onNewToken(token: String) {
        appScope.launch { registry.onNewToken(token) }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        show(message)
        // Termina después de que el servicio muere: por eso el scope de la app y no el del servicio.
        appScope.launch {
            val user = tokenStore.current()?.user?.takeIf { it.role == Role.STUDENT } ?: return@launch
            repository.refresh(user.id)
        }
    }

    private fun show(message: RemoteMessage) {
        if (!notificationsAllowed(this)) return
        val title = message.notification?.title ?: message.data["title"] ?: return
        val body = message.notification?.body ?: message.data["body"]
        val key = message.data["notification_id"] ?: fallbackCodes.incrementAndGet().toString()
        val code = key.hashCode()
        val notification = NotificationCompat.Builder(this, PushChannel.ID)
            .setSmallIcon(R.drawable.ic_stat_workout)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(tapIntent(this, message.data, code))
            .build()
        // El permiso ya se chequeó arriba; el lint no lo ve a través de la función.
        @Suppress("MissingPermission")
        NotificationManagerCompat.from(this).notify("push:$key", PUSH_NOTIFICATION_ID, notification)
    }

    private fun tapIntent(context: Context, data: Map<String, String>, code: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data.forEach { (key, value) -> putExtra(key, value) }
        }
        return PendingIntent.getActivity(context, code, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private companion object {
        // Sin notification_id (resumen de logros) cada push necesita su propio request code.
        val fallbackCodes = AtomicInteger(2000)

        // Fijo y distinto de los de WorkoutNotifications (1001, 1002); lo que distingue cada push es el tag.
        const val PUSH_NOTIFICATION_ID = 3001
    }
}
