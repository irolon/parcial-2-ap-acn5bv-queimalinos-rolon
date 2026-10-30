package com.fittrainer.ui.workout.service

import java.time.Instant

/**
 * La pantalla de la sesión está al frente (entre onResume y onPause). Con la pantalla a la vista el fin
 * del descanso se avisa adentro de la app (snackbar + vibración); la notificación queda para cuando no.
 */
object WorkoutScreenVisibility {
    @Volatile var visible: Boolean = false

    /** Fin de descanso (endsAt) que ya avisó la notificación: la pantalla no lo vuelve a avisar al volver. */
    @Volatile var notifiedRestEnd: Instant? = null
}
