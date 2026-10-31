package com.fittrainer.ui.workout.service

import java.time.Instant
import java.util.concurrent.atomic.AtomicReference

/**
 * La pantalla de la sesión está al frente (entre onResume y onPause). Con la pantalla a la vista el fin
 * del descanso se avisa adentro de la app (snackbar + vibración); la notificación queda para cuando no.
 */
object WorkoutScreenVisibility {
    @Volatile var visible: Boolean = false

    /** Último fin de descanso (endsAt) ya avisado, por la pantalla o por la notificación: el otro no lo repite. */
    val notifiedRestEnd = AtomicReference<Instant?>(null)

    /** Reclama el aviso de este fin de descanso, atómico: true solo para el primero que llega con ese [endsAt]. */
    fun claimRestEnd(endsAt: Instant): Boolean {
        while (true) {
            val current = notifiedRestEnd.get()
            if (current == endsAt) return false
            if (notifiedRestEnd.compareAndSet(current, endsAt)) return true
        }
    }
}

/** La notificación se publica solo con la pantalla fuera de vista y si nadie avisó ya este fin de descanso. */
fun shouldPostRestDone(visible: Boolean, claimed: Boolean): Boolean = !visible && claimed
