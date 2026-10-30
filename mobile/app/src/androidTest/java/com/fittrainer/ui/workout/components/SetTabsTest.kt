package com.fittrainer.ui.workout.components

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollToIndex
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.ui.theme.FitTrainerTheme
import java.time.Instant
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Con muchas series la fila se desliza y la serie en pantalla queda a la vista, también al cambiar de ejercicio. */
@RunWith(AndroidJUnit4::class)
class SetTabsTest {

    @get:Rule val compose = createComposeRule()

    private val now = Instant.parse("2026-10-30T12:00:00Z")

    private fun exercise(position: Int) = WorkoutExercise(
        position, "re-$position", "ex-$position", null, "Ejercicio $position", "chest", null, null, null, 20, 10, 60, 20.0,
    )

    private fun workout(position: Int) = Workout(
        "w-1", "u1", "rt-1", "Larga", now, listOf(exercise(0), exercise(1)), emptyList(), Cursor(position, 15), null,
    )

    @Test fun alCambiarDeEjercicioConLaMismaSerieLaFilaVuelveAMostrarla() {
        var position by mutableIntStateOf(0)
        compose.setContent { FitTrainerTheme { SetTabs(workout(position), shownSet = 15, onSelect = {}) } }
        compose.onNodeWithText("S15").assertIsDisplayed()

        // El alumno desliza la fila hasta el principio y después cambia de ejercicio (también en la serie 15).
        compose.onNode(hasScrollAction()).performScrollToIndex(0)
        compose.onNodeWithText("S1").assertIsDisplayed()
        position = 1
        compose.waitForIdle()

        compose.onNodeWithText("S15").assertIsDisplayed()
    }
}
