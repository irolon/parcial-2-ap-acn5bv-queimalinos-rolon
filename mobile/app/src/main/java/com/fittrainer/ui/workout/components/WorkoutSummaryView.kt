package com.fittrainer.ui.workout.components

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.feedback.FeedbackForm
import com.fittrainer.ui.workout.feedback.FeedbackViewModel
import com.fittrainer.ui.workout.summaryText

/** "Sesión terminada · N series · M min", si ya se subió y el feedback post-entreno (tarjeta 12). */
@Composable
fun WorkoutSummaryView(summary: WorkoutSummary, uploadText: String? = null, onBack: () -> Unit, feedback: FeedbackViewModel = hiltViewModel()) {
    val state by feedback.state.collectAsStateWithLifecycle()
    LaunchedEffect(state.done) { if (state.done) onBack() }
    BackHandler(onBack = onBack) // atrás = saltar
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(state.error) {
        if (state.error) {
            snackbar.showSnackbar("No pudimos guardar. Probá de nuevo")
            feedback.dismissError()
        }
    }
    Box(Modifier.fillMaxSize()) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(Spacing.lg),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Spacing.lg, Alignment.CenterVertically),
        ) {
            Text("¡Bien ahí!", style = MaterialTheme.typography.displayMedium, color = FtColors.TextPrimary)
            Text(summaryText(summary), style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary)
            uploadText?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
            FeedbackForm(state, feedback::onRpe, feedback::onNotes, onSave = { feedback.save(summary.sessionId) }, onSkip = onBack)
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
    }
}
