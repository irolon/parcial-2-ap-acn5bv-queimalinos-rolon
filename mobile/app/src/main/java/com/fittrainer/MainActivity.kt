package com.fittrainer

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.fittrainer.data.invitation.InvitationLink
import com.fittrainer.data.notifications.NotificationLaunchRequests
import com.fittrainer.data.notifications.launchFromIntent
import com.fittrainer.data.workout.WorkoutLaunchRequests
import com.fittrainer.navigation.AppNavHost
import com.fittrainer.navigation.PendingInvitation
import com.fittrainer.ui.theme.FitTrainerTheme
import com.fittrainer.ui.workout.service.WorkoutNotifications
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var pendingInvitation: PendingInvitation
    @Inject lateinit var workoutLaunch: WorkoutLaunchRequests
    @Inject lateinit var notificationLaunch: NotificationLaunchRequests

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Al recrear (rotación) el intent es el mismo: no volver a ofrecer un token ya consumido.
        if (savedInstanceState == null) {
            handleInvitationLink(intent)
            handleWorkoutLaunch(intent)
            handleNotificationLaunch(intent)
        }
        // App siempre oscura: íconos de las barras del sistema claros sobre fondo transparente.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
        )
        setContent {
            FitTrainerTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    AppNavHost()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleInvitationLink(intent)
        handleWorkoutLaunch(intent)
        handleNotificationLaunch(intent)
    }

    /** Tocar un push: se anota el destino y la navegación lo consume cuando haya sesión de alumno. */
    private fun handleNotificationLaunch(intent: Intent?) {
        val extras = intent?.extras ?: return
        val data = extras.keySet().mapNotNull { key ->
            // Solo los extras que son texto: getString sobre un Long/Boolean (google.sent_time, etc.) loguea un warning.
            @Suppress("DEPRECATION")
            (extras.get(key) as? String)?.let { key to it }
        }.toMap()
        val fromHistory = intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0
        launchFromIntent(fromHistory, data)?.let(notificationLaunch::request)
    }

    /** Tocar la notificación de la sesión: abrirla (la navegación lo consume). */
    private fun handleWorkoutLaunch(intent: Intent?) {
        if (intent?.getBooleanExtra(WorkoutNotifications.EXTRA_OPEN_WORKOUT, false) == true) workoutLaunch.request()
    }

    private fun handleInvitationLink(intent: Intent?) {
        if (intent?.action != Intent.ACTION_VIEW) return
        // Relanzada desde Recientes: el link ya se usó, no volver a ofrecerlo.
        if (intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0) return
        intent.dataString?.let(InvitationLink::parse)?.let(pendingInvitation::offer)
    }
}
