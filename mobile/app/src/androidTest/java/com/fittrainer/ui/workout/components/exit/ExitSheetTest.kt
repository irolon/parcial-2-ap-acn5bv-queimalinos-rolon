package com.fittrainer.ui.workout.components.exit

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.ui.theme.FitTrainerTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Cada acción de la hoja la cierra con su animación y se ejecuta una sola vez, aunque se toque dos veces. */
@RunWith(AndroidJUnit4::class)
class ExitSheetTest {

    @get:Rule val compose = createComposeRule()

    private var dismissed = 0
    private var finished = 0
    private var discarded = 0

    private fun showSheet() {
        compose.setContent {
            FitTrainerTheme {
                ExitSheet("Llevás 3 de 20 series", onDismiss = { dismissed++ }, onFinish = { finished++ }, onDiscard = { discarded++ })
            }
        }
        compose.onNodeWithText("Llevás 3 de 20 series").assertIsDisplayed()
    }

    /** Toca dos veces seguidas, antes de que termine de bajar la hoja. */
    private fun doubleTap(label: String) {
        compose.mainClock.autoAdvance = false
        compose.onNodeWithText(label).performClick()
        compose.onNodeWithText(label).performClick()
        compose.mainClock.autoAdvance = true
        compose.waitForIdle()
    }

    @Test fun seguirEntrenandoCierraLaHojaYAvisaUnaSolaVez() {
        showSheet()
        doubleTap("Seguir entrenando")
        assertEquals(1, dismissed)
        assertEquals(0, finished + discarded)
    }

    @Test fun terminarSesionCierraLaHojaYAvisaUnaSolaVez() {
        showSheet()
        doubleTap("Terminar sesión")
        assertEquals(1, finished)
        assertEquals(0, dismissed + discarded)
    }

    @Test fun descartarSesionCierraLaHojaYAvisaUnaSolaVez() {
        showSheet()
        doubleTap("Descartar sesión")
        assertEquals(1, discarded)
        assertEquals(0, dismissed + finished)
    }
}
