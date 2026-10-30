package com.fittrainer.ui.workout

import android.content.Context
import android.media.RingtoneManager
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.fittrainer.data.workout.Rest
import com.fittrainer.data.workout.WorkoutSet
import com.fittrainer.data.workout.lastDoneSet
import com.fittrainer.ui.workout.service.WorkoutScreenVisibility
import java.time.Instant

/** Margen para dar por "terminado solo" un descanso que la pantalla o el service cerraron apenas antes de endsAt. */
private const val REST_END_TOLERANCE_MS = 1_000L

/** Pasado este tiempo desde endsAt, el fin ya no es noticia (la app volvió tarde): no suena ni vibra. */
private const val REST_END_WINDOW_MS = 5_000L

fun setSavedText(set: WorkoutSet): String = "Serie ${set.setNumber} guardada · ${kgNumber(set.kg)} kg × ${set.reps}"

fun restDoneInAppText(setNumber: Int, totalSets: Int): String = "Descanso terminado · Serie $setNumber de $totalSets"

/**
 * Se avisa el fin adentro de la app si el descanso llegó a 0 (no lo saltaron ni estaba en pausa), recién
 * (no al volver mucho después) y si la notificación no lo avisó ya ([notifiedEnd]: celular bloqueado).
 */
fun shouldAlertRestEnd(before: Rest, now: Instant, notifiedEnd: Instant?): Boolean {
    val endsAt = before.endsAt ?: return false
    return endsAt != notifiedEnd &&
        !now.isBefore(endsAt.minusMillis(REST_END_TOLERANCE_MS)) &&
        !now.isAfter(endsAt.plusMillis(REST_END_WINDOW_MS))
}

/**
 * Avisos dentro de la sesión. Serie guardada: solo si no arranca un descanso (el timer ya la muestra con ✓).
 * Fin del descanso: snackbar + vibración y sonido, en lugar de la notificación del sistema.
 */
@Composable
fun WorkoutFeedbackEffects(state: WorkoutUiState, clock: () -> Instant, snackbar: SnackbarHostState) {
    val context = LocalContext.current
    val workout = state.workout
    var lastCount by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(workout?.sets?.size) {
        val before = lastCount
        lastCount = workout?.sets?.size
        val saved = workout?.lastDoneSet()
        if (before != null && saved != null && workout.sets.size > before && !state.isResting) {
            snackbar.flash(setSavedText(saved))
        }
    }
    var lastRest by remember { mutableStateOf<Rest?>(null) }
    LaunchedEffect(workout?.rest) {
        val before = lastRest
        lastRest = workout?.rest
        val exercise = state.exercise
        if (before != null && workout != null && workout.rest == null && exercise != null && shouldAlertRestEnd(before, clock(), WorkoutScreenVisibility.notifiedRestEnd)) {
            alertRestDone(context)
            snackbar.flash(restDoneInAppText(workout.cursor.setNumber, exercise.totalSets))
        }
    }
}

/** Reemplaza el aviso que esté a la vista: el último es el que importa. */
suspend fun SnackbarHostState.flash(message: String) {
    currentSnackbarData?.dismiss()
    showSnackbar(message, duration = SnackbarDuration.Short)
}

/** Vibración y sonido de notificación: el celular puede estar apoyado en el banco. */
private fun alertRestDone(context: Context) {
    @Suppress("DEPRECATION") // VibratorManager es API 31; minSdk 26.
    context.getSystemService(Vibrator::class.java)
        ?.vibrate(VibrationEffect.createOneShot(400, VibrationEffect.DEFAULT_AMPLITUDE))
    RingtoneManager.getRingtone(context, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))?.play()
}
