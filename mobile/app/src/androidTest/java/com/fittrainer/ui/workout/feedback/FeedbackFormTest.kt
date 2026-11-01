package com.fittrainer.ui.workout.feedback

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.ui.theme.FitTrainerTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FeedbackFormTest {
    @get:Rule val compose = createComposeRule()

    @Test fun tocarUnRpeMuestraSuEtiquetaYSaltarNoGuarda() {
        var state by mutableStateOf(FeedbackUiState())
        var skipped = 0
        var saved = 0
        compose.setContent {
            FitTrainerTheme {
                FeedbackForm(state, onRpe = { state = state.copy(rpe = it) }, onNotes = {}, onSave = { saved++ }, onSkip = { skipped++ })
            }
        }
        compose.onNodeWithText("Guardar").assertIsNotEnabled()
        compose.onNodeWithContentDescription("RPE 7").performClick()
        compose.onNodeWithText("7 · Difícil, te quedaban 2-3 reps").assertExists()
        compose.onNodeWithText("Saltar").performClick()
        assertEquals(1, skipped)
        assertEquals(0, saved)
    }

    @Test fun losRpeSonRadiosDeUnGrupoYElElegidoQuedaSeleccionado() {
        var state by mutableStateOf(FeedbackUiState())
        compose.setContent { FitTrainerTheme { FeedbackForm(state, onRpe = { state = state.copy(rpe = it) }, onNotes = {}, onSave = {}, onSkip = {}) } }
        compose.onNodeWithContentDescription("RPE 7").performClick()
        compose.onNodeWithContentDescription("RPE 7").assertIsSelected()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.RadioButton))
        compose.onNodeWithContentDescription("RPE 3").assertIsNotSelected()
    }
}
