package com.fittrainer.ui.workout.service

import android.app.NotificationManager.IMPORTANCE_DEFAULT
import android.app.NotificationManager.IMPORTANCE_HIGH
import android.app.NotificationManager.IMPORTANCE_LOW
import android.app.NotificationManager.IMPORTANCE_MIN
import android.app.NotificationManager.IMPORTANCE_NONE
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Android no hace sonar un canal con importancia menor a DEFAULT: el aviso de adentro tampoco. */
class ChannelSilencedTest {
    @Test fun importanciaNingunaMinimaYBajaSilencian() {
        assertTrue(channelSilenced(IMPORTANCE_NONE, hasSound = true))
        assertTrue(channelSilenced(IMPORTANCE_MIN, hasSound = true))
        assertTrue(channelSilenced(IMPORTANCE_LOW, hasSound = true))
    }

    @Test fun defaultYAltaConSonidoSuenan() {
        assertFalse(channelSilenced(IMPORTANCE_DEFAULT, hasSound = true))
        assertFalse(channelSilenced(IMPORTANCE_HIGH, hasSound = true))
    }

    @Test fun sinSonidoSilenciaAunqueSeaAlta() {
        assertTrue(channelSilenced(IMPORTANCE_HIGH, hasSound = false))
        assertTrue(channelSilenced(IMPORTANCE_DEFAULT, hasSound = false))
    }
}
