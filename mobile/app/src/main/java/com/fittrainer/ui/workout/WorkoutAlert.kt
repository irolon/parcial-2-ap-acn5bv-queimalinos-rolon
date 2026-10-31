package com.fittrainer.ui.workout

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.produceState
import com.fittrainer.ui.workout.service.REST_DONE_VIBRATION
import com.fittrainer.ui.workout.service.WorkoutNotifications
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Qué hace el aviso de fin de descanso de adentro de la app. */
data class RestAlert(val sound: Boolean, val vibrate: Boolean)

/**
 * Igual que la notificación: sonido solo en modo normal y si el canal "Fin del descanso" no está silenciado;
 * vibración salvo en modo silencio.
 */
fun restAlertMode(ringerMode: Int, channelSilenced: Boolean): RestAlert = RestAlert(
    sound = ringerMode == AudioManager.RINGER_MODE_NORMAL && !channelSilenced,
    vibrate = ringerMode != AudioManager.RINGER_MODE_SILENT,
)

/** El Ringtone se arma una sola vez, fuera del hilo principal (consulta al ContentResolver). */
@Composable
fun rememberRestRingtone(context: Context): State<Ringtone?> = produceState<Ringtone?>(null, context) {
    value = withContext(Dispatchers.IO) {
        RingtoneManager.getRingtone(context, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            ?.apply { audioAttributes = notificationAudio() }
    }
}

/** Vibración y sonido de notificación: el celular puede estar apoyado en el banco. */
fun alertRestDone(context: Context, ringtone: State<Ringtone?>) {
    val ringer = context.getSystemService(AudioManager::class.java)?.ringerMode ?: AudioManager.RINGER_MODE_NORMAL
    val mode = restAlertMode(ringer, WorkoutNotifications.restDoneChannelSilenced(context))
    if (mode.vibrate) vibrate(context)
    if (mode.sound) ringtone.value?.play()
}

private fun vibrate(context: Context) {
    val vibrator = context.getSystemService(Vibrator::class.java) ?: return
    val effect = VibrationEffect.createWaveform(REST_DONE_VIBRATION, -1)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_NOTIFICATION))
    } else {
        vibrator.vibrate(effect, notificationAudio())
    }
}

private fun notificationAudio(): AudioAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()
