package com.fittrainer.ui.workout.service

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.fittrainer.MainActivity
import com.fittrainer.R
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout
import java.time.Instant

/** En Android 13+ hace falta el permiso; antes, alcanza con que el usuario no las haya apagado. */
fun notificationsAllowed(context: Context): Boolean =
    (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
        NotificationManagerCompat.from(context).areNotificationsEnabled()

object WorkoutNotifications {
    const val EXTRA_OPEN_WORKOUT = "com.fittrainer.OPEN_WORKOUT"
    const val ID_ONGOING = 1001
    private const val ID_REST_DONE = 1002
    private const val CHANNEL_ONGOING = "workout_ongoing"
    private const val CHANNEL_REST_DONE = "workout_rest_done"

    /** Idempotente: crear un canal que ya existe no hace nada. */
    fun createChannels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ONGOING, "Sesión en curso", NotificationManager.IMPORTANCE_LOW),
        )
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_REST_DONE, "Fin del descanso", NotificationManager.IMPORTANCE_HIGH).apply {
                enableVibration(true)
                vibrationPattern = REST_DONE_VIBRATION
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            },
        )
    }

    /** La que exige startForeground antes de leer Room. */
    fun starting(context: Context): Notification = ongoingBuilder(context).setContentTitle("Sesión en curso").build()

    /** Durante el descanso, el sistema cuenta para atrás solo (sin redibujar cada segundo). */
    fun ongoing(context: Context, w: Workout): Notification {
        val restEnd = w.rest?.endsAt
        return ongoingBuilder(context)
            .setContentTitle(ongoingTitle(w, resting = w.rest != null))
            .setContentText(ongoingText(w))
            .apply {
                if (restEnd != null) {
                    setUsesChronometer(true)
                    setChronometerCountDown(true)
                    setWhen(restEnd.toEpochMilli())
                    setShowWhen(true)
                }
            }
            .build()
    }

    /** [restEnd]: el endsAt del descanso que terminó; se reclama para que la pantalla no lo repita. */
    fun notifyRestDone(context: Context, next: Load, restEnd: Instant) {
        // Con la sesión a la vista avisa la pantalla (WorkoutFeedback): sin banner del sistema encima.
        if (WorkoutScreenVisibility.visible || !notificationsAllowed(context)) return
        // El reclamo es atómico: si la pantalla avisó justo antes de pasar a segundo plano, no se repite.
        if (!shouldPostRestDone(WorkoutScreenVisibility.visible, WorkoutScreenVisibility.claimRestEnd(restEnd))) return
        val notification = NotificationCompat.Builder(context, CHANNEL_REST_DONE)
            .setSmallIcon(R.drawable.ic_stat_workout)
            .setContentTitle(REST_DONE_TITLE)
            .setContentText(restDoneText(next))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setContentIntent(openIntent(context))
            .build()
        try {
            NotificationManagerCompat.from(context).notify(ID_REST_DONE, notification)
        } catch (e: SecurityException) {
            // El permiso se revocó entre el chequeo y el aviso: el timer en pantalla sigue andando.
        }
    }

    /**
     * Saca "Descanso terminado" de la bandeja: al cerrar la sesión (terminar, descartar, logout) o al
     * arrancar otro descanso. No en onDestroy: si Android mata el service, el aviso tiene que quedar.
     */
    fun cancelRestDone(context: Context) {
        NotificationManagerCompat.from(context).cancel(ID_REST_DONE)
        // Ese aviso ya no corresponde a ningún descanso (la sesión cerró o arrancó otro).
        WorkoutScreenVisibility.notifiedRestEnd.set(null)
    }

    /** El alumno apagó o silenció el canal "Fin del descanso": el aviso de adentro tampoco suena. */
    fun restDoneChannelSilenced(context: Context): Boolean {
        val channel = context.getSystemService(NotificationManager::class.java).getNotificationChannel(CHANNEL_REST_DONE)
            ?: return false
        return channelSilenced(channel.importance, channel.sound != null)
    }

    private fun ongoingBuilder(context: Context) = NotificationCompat.Builder(context, CHANNEL_ONGOING)
        .setSmallIcon(R.drawable.ic_stat_workout)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
        .setContentIntent(openIntent(context))

    private fun openIntent(context: Context): PendingIntent = PendingIntent.getActivity(
        context,
        0,
        Intent(context, MainActivity::class.java)
            .putExtra(EXTRA_OPEN_WORKOUT, true)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
}

/** Android no hace sonar un canal con importancia menor a DEFAULT (NONE, MIN, LOW), ni uno sin sonido. */
fun channelSilenced(importance: Int, hasSound: Boolean): Boolean =
    importance < NotificationManager.IMPORTANCE_DEFAULT || !hasSound
