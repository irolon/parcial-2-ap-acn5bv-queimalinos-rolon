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
import com.fittrainer.navigation.AppNavHost
import com.fittrainer.navigation.PendingInvitation
import com.fittrainer.ui.theme.FitTrainerTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var pendingInvitation: PendingInvitation

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Al recrear (rotación) el intent es el mismo: no volver a ofrecer un token ya consumido.
        if (savedInstanceState == null) handleInvitationLink(intent)
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
    }

    private fun handleInvitationLink(intent: Intent?) {
        if (intent?.action != Intent.ACTION_VIEW) return
        // Relanzada desde Recientes: el link ya se usó, no volver a ofrecerlo.
        if (intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0) return
        intent.dataString?.let(InvitationLink::parse)?.let(pendingInvitation::offer)
    }
}
