package com.fittrainer.ui.workout

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Rest
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.ui.theme.FitTrainerTheme
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Presentación: el error de una escritura del descanso se ve con el timer en pantalla y se puede descartar. */
@RunWith(AndroidJUnit4::class)
class WorkoutContentTest {

    @get:Rule val compose = createComposeRule()

    private val now = Instant.parse("2026-10-17T12:00:00Z")
    private var dismissed = 0

    private val exercise = WorkoutExercise(
        0, "re-0", "ex-0", null, "Press banca", "chest", null, null, null, 3, 8, 60, 40.0,
    )

    private fun resting(error: String?) = WorkoutUiState(
        loaded = true,
        workout = Workout(
            "w-1", "u1", "rt-1", "Push", now, listOf(exercise), emptyList(),
            Cursor(0, 1), Rest(now.plusSeconds(45), 60, null),
        ),
        error = error,
    )

    private fun show(state: WorkoutUiState) = compose.setContent {
        val none = {}
        val actions = WorkoutActions(
            none, none, {}, {}, none, none, none, none, {}, none, none, none, onDismissError = { dismissed++ },
        )
        FitTrainerTheme { WorkoutContent(state, now, notificationsOn = true, actions = actions) }
    }

    @Test fun errorDelDescansoSeVeConElTimerYSeDescarta() {
        show(resting(REST_SAVE_FAILED))

        compose.onNodeWithText("DESCANSO").assertIsDisplayed()
        compose.onNodeWithText(REST_SAVE_FAILED).assertIsDisplayed()
        compose.onNodeWithText("OK").performClick()

        assertEquals(1, dismissed)
    }
}
