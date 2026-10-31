package com.fittrainer.ui.workout.history.detail.components

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.workout.history.HistoryExercise
import com.fittrainer.data.workout.history.HistorySet
import com.fittrainer.ui.theme.FitTrainerTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ExerciseBlockTest {
    @get:Rule val compose = createComposeRule()

    @Test fun muestraNombreSustitutoPlanYSeries() {
        val exercise = HistoryExercise("Press de banca", "Press con mancuernas", 4, 10, 60.0, true, listOf(HistorySet(1, 10, 62.5)))
        compose.setContent { FitTrainerTheme { ExerciseBlock(exercise) } }
        compose.onNodeWithText("Press de banca  🏆").assertIsDisplayed()
        compose.onNodeWithText("en lugar de Press con mancuernas").assertIsDisplayed()
        compose.onNodeWithText("Plan: 4 × 10 · 60 kg").assertIsDisplayed()
        compose.onNodeWithText("S1 · 62,5 kg × 10").assertIsDisplayed()
    }
}
