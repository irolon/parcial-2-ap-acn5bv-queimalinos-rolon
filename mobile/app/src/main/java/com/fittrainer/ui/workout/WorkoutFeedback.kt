package com.fittrainer.ui.workout

import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Rest
import com.fittrainer.data.workout.WorkoutSet
import com.fittrainer.data.workout.lastDoneSet
import com.fittrainer.ui.workout.service.REST_DONE_TITLE
import com.fittrainer.ui.workout.service.WorkoutScreenVisibility
import com.fittrainer.ui.workout.service.restDoneText
import java.time.Instant

/** Margen para dar por "terminado solo" un descanso que la pantalla o el service cerraron apenas antes de endsAt. */
private const val REST_END_TOLERANCE_MS = 1_000L

/** Pasado este tiempo desde endsAt, el fin ya no es noticia (la app volvió tarde): no suena ni vibra. */
private const val REST_END_WINDOW_MS = 5_000L

fun setSavedText(set: WorkoutSet): String = "Serie ${set.setNumber} guardada · ${kgNumber(set.kg)} kg × ${set.reps}"

/** Igual que la notificación ("Próxima: 70 kg × 8"); con [exerciseName] si el que sigue es otro ejercicio. */
fun restDoneInAppText(next: Load, exerciseName: String?): String =
    listOfNotNull(REST_DONE_TITLE, exerciseName, restDoneText(next)).joinToString(" · ")

/** "Serie guardada" solo si entró una serie nueva (no la primera emisión ni una corrección) y no arranca descanso. */
fun shouldFlashSetSaved(before: Int?, after: Int, isResting: Boolean): Boolean =
    before != null && after > before && !isResting

/**
 * Se avisa el fin adentro de la app si el descanso llegó a 0 (no lo saltaron ni estaba en pausa), recién
 * (no al volver mucho después), si la notificación no lo avisó ya ([notifiedEnd]: celular bloqueado) y si
 * la pantalla está al frente ([screenVisible]): en pausa pero visible (cortina, pantalla dividida) avisa el service.
 */
fun shouldAlertRestEnd(before: Rest, now: Instant, notifiedEnd: Instant?, screenVisible: Boolean): Boolean {
    val endsAt = before.endsAt ?: return false
    return screenVisible &&
        endsAt != notifiedEnd &&
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
    val ringtone = rememberRestRingtone(context)
    val workout = state.workout
    var lastCount by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(workout?.sets?.size) {
        val before = lastCount
        lastCount = workout?.sets?.size
        val saved = workout?.lastDoneSet()
        if (workout != null && saved != null && shouldFlashSetSaved(before, workout.sets.size, state.isResting)) {
            snackbar.flash(setSavedText(saved))
        }
    }
    var lastRest by remember { mutableStateOf<Rest?>(null) }
    LaunchedEffect(workout?.rest) {
        val before = lastRest
        lastRest = workout?.rest
        val exercise = state.exercise
        val ended = before != null && workout?.rest == null &&
            shouldAlertRestEnd(before, clock(), WorkoutScreenVisibility.notifiedRestEnd.get(), WorkoutScreenVisibility.visible) &&
            // Reclamo atómico por endsAt: si el service ya avisó (o avisa en paralelo), la pantalla no repite.
            before.endsAt?.let { WorkoutScreenVisibility.claimRestEnd(it) } == true
        if (ended && workout != null && exercise != null) {
            alertRestDone(context, ringtone)
            // El cursor ya está en la serie que sigue: si la última hecha era de otro ejercicio, se nombra.
            val changed = workout.lastDoneSet()?.position != workout.cursor.position
            snackbar.flash(restDoneInAppText(state.load, exercise.name.takeIf { changed }))
        }
    }
}

/** Reemplaza el aviso que esté a la vista: el último es el que importa. */
suspend fun SnackbarHostState.flash(message: String) {
    currentSnackbarData?.dismiss()
    showSnackbar(message, duration = SnackbarDuration.Short)
}
