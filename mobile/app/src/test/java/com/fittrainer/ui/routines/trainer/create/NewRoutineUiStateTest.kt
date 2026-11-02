package com.fittrainer.ui.routines.trainer.create

import org.junit.Assert.assertEquals
import org.junit.Test

class NewRoutineUiStateTest {

    @Test fun `con una activa la nombra en singular`() {
        assertEquals("Desactivar la rutina actual (Push)", deactivateLabel(listOf("Push")))
    }

    @Test fun `con varias activas va en plural con todos los nombres`() {
        assertEquals("Desactivar las rutinas activas (Push, Pull)", deactivateLabel(listOf("Push", "Pull")))
    }

    @Test fun `sin nombres queda el texto solo`() {
        assertEquals("Desactivar la rutina actual", deactivateLabel(emptyList()))
    }
}
