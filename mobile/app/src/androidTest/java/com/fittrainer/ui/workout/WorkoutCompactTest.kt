package com.fittrainer.ui.workout

import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.DeviceConfigurationOverride
import androidx.compose.ui.test.FontScale
import androidx.compose.ui.test.ForcedSize
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.then
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Rest
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.ui.theme.FitTrainerTheme
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Galaxy S10 con zoom grande y letra al 110 %: nada se recorta y ningún botón parte su texto. */
@RunWith(AndroidJUnit4::class)
class WorkoutCompactTest {

    @get:Rule val compose = createComposeRule()

    private val now = Instant.parse("2026-11-11T21:53:00Z")

    private val exercise = WorkoutExercise(
        0, "re-0", "ex-0", null, "Press banca plano", "chest", null, null, null, 4, 8, 120, 105.0,
    )

    private fun state(rest: Rest?) = WorkoutUiState(
        loaded = true,
        workout = Workout("w-1", "u1", "rt-1", "Tren superior", now, listOf(exercise), emptyList(), Cursor(0, 1), rest),
        load = Load(105.0, 8),
    )

    private fun show(state: WorkoutUiState) = compose.setContent {
        val none = {}
        val actions = WorkoutActions(none, none, {}, {}, none, none, none, none, {}, none, none, none, none)
        DeviceConfigurationOverride(
            DeviceConfigurationOverride.ForcedSize(DpSize(320.dp, 560.dp)) then DeviceConfigurationOverride.FontScale(1.1f),
        ) {
            FitTrainerTheme { WorkoutContent(state, now, notificationsOn = true, actions = actions) }
        }
    }

    private fun assertOneLine(text: String) {
        val node = compose.onNodeWithText(text).fetchSemanticsNode()
        val layouts = mutableListOf<TextLayoutResult>()
        node.config[SemanticsActions.GetTextLayoutResult].action?.invoke(layouts)
        val layout = layouts.first()
        // Una línea y sin desbordar: con maxLines = 1 una palabra cortada también da una línea, pero desborda.
        assertEquals("\"$text\" en una línea", 1, layout.lineCount)
        assertFalse("\"$text\" no entra (se corta)", layout.didOverflowWidth || layout.didOverflowHeight)
    }

    @Test fun serieSeBajaHastaLasAccionesYCadaTextoEnUnaLinea() {
        show(state(rest = null))

        listOf("Técnica", "Reemplazar", "✦ IA").forEach {
            compose.onNodeWithText(it).performScrollTo().assertIsDisplayed()
            assertOneLine(it)
        }
    }

    @Test fun timerConLosCuatroBotonesEnUnaLinea() {
        show(state(rest = Rest(now.plusSeconds(109), 120, null)))

        listOf("−15″", "+15″", "Pausar", "Saltar").forEach {
            compose.onNodeWithText(it).assertIsDisplayed()
            assertOneLine(it)
        }
    }
}
