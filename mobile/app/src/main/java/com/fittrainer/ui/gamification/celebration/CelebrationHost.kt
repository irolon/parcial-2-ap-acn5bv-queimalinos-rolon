package com.fittrainer.ui.gamification.celebration

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.gamification.components.MedalIcon
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Muestra las celebraciones pendientes fuera de la sesión activa (spec §4.4). Va en el RoleShell del alumno. */
@Composable
fun CelebrationHost(onWorkout: Boolean, viewModel: CelebrationViewModel = hiltViewModel()) {
    val pending by viewModel.pending.collectAsStateWithLifecycle()
    val dialog = celebrationDialog(pending, onWorkout) ?: return
    Dialog(onDismissRequest = {}, properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnClickOutside = false)) {
        CelebrationContent(dialog, onContinue = { viewModel.onShown(dialog.codes) })
    }
}

@Composable
private fun CelebrationContent(dialog: CelebrationDialogUi, onContinue: () -> Unit) {
    val haptics = LocalHapticFeedback.current
    val scale = remember(dialog.codes) { Animatable(0.3f) }
    LaunchedEffect(dialog.codes) {
        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
        scale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy))
    }
    val medal = Modifier.graphicsLayer { scaleX = scale.value; scaleY = scale.value }
    Column(Modifier.fillMaxSize().background(FtColors.Background.copy(alpha = 0.96f)).padding(Spacing.xl)) {
        // Lo largo (varios logros, fuente grande, pantalla baja) scrollea; "Seguir" queda siempre a la vista.
        BoxWithConstraints(Modifier.weight(1f).fillMaxWidth()) {
            Column(
                Modifier.fillMaxWidth().heightIn(min = maxHeight).verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(Spacing.lg, Alignment.CenterVertically),
            ) {
                when (dialog) {
                    is CelebrationDialogUi.Single -> {
                        Box(medal) { MedalIcon(dialog.item.category, unlocked = true, size = 120.dp) }
                        Text("¡Logro desbloqueado!", style = MaterialTheme.typography.labelLarge, color = FtColors.Green)
                        Text(dialog.item.name, style = MaterialTheme.typography.headlineMedium, color = FtColors.TextPrimary, textAlign = TextAlign.Center)
                        dialog.item.description?.let {
                            Text(it, style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary, textAlign = TextAlign.Center)
                        }
                    }
                    is CelebrationDialogUi.Group -> {
                        Box(medal) { MedalIcon("milestone", unlocked = true, size = 120.dp) }
                        Text(dialog.title, style = MaterialTheme.typography.headlineMedium, color = FtColors.TextPrimary, textAlign = TextAlign.Center)
                        dialog.items.forEach { Text(it.name, style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary, textAlign = TextAlign.Center) }
                    }
                }
            }
        }
        Button(
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
        ) { Text("Seguir") }
    }
}
