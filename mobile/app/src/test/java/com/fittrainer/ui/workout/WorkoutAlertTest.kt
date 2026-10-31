package com.fittrainer.ui.workout

import android.media.AudioManager
import org.junit.Assert.assertEquals
import org.junit.Test

/** Qué hace el aviso de adentro según el modo del celular y lo que el alumno configuró en el canal. */
class WorkoutAlertTest {

    @Test fun enModoNormalSuenaYVibra() {
        assertEquals(RestAlert(sound = true, vibrate = true), restAlertMode(AudioManager.RINGER_MODE_NORMAL, channelSilenced = false))
    }

    @Test fun enVibracionSoloVibra() {
        assertEquals(RestAlert(sound = false, vibrate = true), restAlertMode(AudioManager.RINGER_MODE_VIBRATE, channelSilenced = false))
    }

    @Test fun enSilencioNoHaceNada() {
        assertEquals(RestAlert(sound = false, vibrate = false), restAlertMode(AudioManager.RINGER_MODE_SILENT, channelSilenced = false))
    }

    @Test fun conElCanalSilenciadoNoSuenaPeroVibra() {
        assertEquals(RestAlert(sound = false, vibrate = true), restAlertMode(AudioManager.RINGER_MODE_NORMAL, channelSilenced = true))
    }
}
