package com.fittrainer.ui.workout

import android.Manifest
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.workout.isOver
import com.fittrainer.data.workout.pendingSets
import com.fittrainer.ui.components.exercise.ExerciseDetail
import com.fittrainer.ui.components.exercise.ExerciseDetailSheet
import com.fittrainer.ui.sync.UploadStatusViewModel
import com.fittrainer.ui.sync.sessionUploadText
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.workout.components.ExerciseListSheet
import com.fittrainer.ui.workout.components.ExitMenu
import com.fittrainer.ui.workout.components.ExitStep
import com.fittrainer.ui.workout.components.ManualEntryDialog
import com.fittrainer.ui.workout.components.ReplaceSheet
import com.fittrainer.ui.workout.components.WorkoutSummaryView
import com.fittrainer.ui.workout.service.WorkoutService
import com.fittrainer.ui.workout.service.notificationsAllowed
import kotlinx.coroutines.delay

private enum class Overlay { Edit, Technique, Replace, List }

/** Guía Mobile p.13-14 · Sesión activa y timer de descanso. */
@Composable
fun WorkoutScreen(onExit: () -> Unit, viewModel: WorkoutViewModel = hiltViewModel(), uploads: UploadStatusViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var notificationsOn by remember { mutableStateOf(notificationsAllowed(context)) }
    val askPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        notificationsOn = notificationsAllowed(context)
    }
    LaunchedEffect(Unit) {
        WorkoutService.start(context)
        if (!notificationsOn && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            askPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
    // Volviendo de Ajustes: el permiso pudo cambiar.
    LifecycleResumeEffect(Unit) {
        notificationsOn = notificationsAllowed(context)
        onPauseOrDispose { }
    }
    LaunchedEffect(state.closed) { if (state.closed) onExit() }

    val now by produceState(viewModel.now()) {
        while (true) {
            value = viewModel.now()
            delay(250)
        }
    }
    val rest = state.workout?.rest
    LaunchedEffect(rest, now) { if (rest != null && rest.isOver(now)) viewModel.onRestElapsed() }
    // Durante el descanso la pantalla no se apaga sola (celular apoyado en el banco).
    val view = LocalView.current
    DisposableEffect(state.isResting) {
        view.keepScreenOn = state.isResting
        onDispose { view.keepScreenOn = false }
    }

    var exit by remember { mutableStateOf<ExitStep?>(null) }
    var overlay by remember { mutableStateOf<Overlay?>(null) }
    Box(Modifier.fillMaxSize().background(FtColors.Background).safeDrawingPadding()) {
        state.summary?.let { summary ->
            val upload by remember(summary.sessionId) { uploads.session(summary.sessionId) }
                .collectAsStateWithLifecycle(initialValue = null)
            WorkoutSummaryView(summary, sessionUploadText(upload), onExit)
            return@Box
        }
        WorkoutContent(
            state, now, notificationsOn,
            WorkoutActions(
                onClose = { exit = ExitStep.Menu },
                onOpenList = { overlay = Overlay.List },
                onSelectSet = viewModel::onSelectSet,
                onAdjustKg = viewModel::onAdjustKg,
                onEdit = { overlay = Overlay.Edit },
                onConfirm = viewModel::onConfirm,
                onTechnique = { overlay = Overlay.Technique },
                onReplace = { overlay = Overlay.Replace },
                onRestAdjust = viewModel::onRestAdjust,
                onRestTogglePause = viewModel::onRestTogglePause,
                onRestSkip = viewModel::onRestSkip,
                onOpenSettings = {
                    context.startActivity(
                        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
                    )
                },
                onDismissError = viewModel::dismissError,
            ),
        )
    }
    val workout = state.workout ?: return
    val exercise = state.exercise ?: return
    exit?.let { step ->
        ExitMenu(
            step, workout.pendingSets(), onStep = { exit = it },
            onFinish = { exit = null; viewModel.onFinish() },
            onDiscard = { exit = null; viewModel.onDiscard() },
        )
    }
    when (overlay) {
        Overlay.Edit -> ManualEntryDialog(state.load, onDismiss = { overlay = null }) { kg, reps ->
            viewModel.onManualEntry(kg, reps)
            overlay = null
        }
        Overlay.Technique -> ExerciseDetailSheet(
            ExerciseDetail(
                exercise.name, exercise.muscleGroup, exercise.equipment, exercise.videoUrl, exercise.description,
                exercise.sets, exercise.reps, exercise.suggestedKg, null, exercise.restSeconds, null,
            ),
            canOpenVideo = !state.isOffline,
            onDismiss = { overlay = null },
        )
        Overlay.Replace -> ReplaceSheet(state.library, exercise.muscleGroup, exercise.exerciseId, onDismiss = { overlay = null }) {
            viewModel.onReplace(it)
            overlay = null
        }
        Overlay.List -> ExerciseListSheet(workout, onDismiss = { overlay = null }) {
            viewModel.onSelectExercise(it)
            overlay = null
        }
        null -> Unit
    }
}
