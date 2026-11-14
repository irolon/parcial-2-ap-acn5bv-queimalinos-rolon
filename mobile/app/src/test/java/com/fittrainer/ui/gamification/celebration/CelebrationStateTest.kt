package com.fittrainer.ui.gamification.celebration

import com.fittrainer.data.gamification.Celebration
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CelebrationStateTest {
    private fun c(code: String) = Celebration(code, "Logro $code", null, "milestone")

    @Test fun nadaPendienteNoMuestraNada() = assertNull(celebrationDialog(emptyList(), onWorkout = false))

    @Test fun duranteLaSesionActivaNoInterrumpe() = assertNull(celebrationDialog(listOf(c("A")), onWorkout = true))

    @Test fun unoODosVanDeAUno() {
        assertEquals(CelebrationDialogUi.Single(c("A")), celebrationDialog(listOf(c("A"), c("B")), onWorkout = false))
    }

    @Test fun tresOMasVanEnUnSoloDialogo() {
        val pending = listOf(c("A"), c("B"), c("C"))
        val dialog = celebrationDialog(pending, onWorkout = false) as CelebrationDialogUi.Group
        assertEquals(pending, dialog.items)
        assertEquals(listOf("A", "B", "C"), dialog.codes)
        assertEquals("Desbloqueaste 3 logros", dialog.title)
    }
}
