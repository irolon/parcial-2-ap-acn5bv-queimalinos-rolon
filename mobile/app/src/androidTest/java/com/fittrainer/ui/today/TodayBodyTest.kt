package com.fittrainer.ui.today

import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.ui.theme.FitTrainerTheme
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Hoy toca Piernas pero quedó abierta una sesión de Pecho (arrancada desde Mis rutinas): no se mezclan. */
@RunWith(AndroidJUnit4::class)
class TodayBodyTest {

    @get:Rule val compose = createComposeRule()

    private val now = Instant.parse("2026-11-02T12:00:00Z")
    private val legs = Routine(
        "rt-legs", "Piernas", null, setOf(DayOfWeek.MONDAY), now,
        listOf(RoutineExercise("re-1", "ex-1", "Sentadilla", "quads", null, null, 4, 10, 90, 60.0, null, null)),
    )
    private val chestWorkout = Workout(
        "w-1", "u1", "rt-chest", "Pecho", now,
        listOf(WorkoutExercise(0, "re-9", "ex-9", null, "Press", "chest", null, null, null, 4, 10, 90, 40.0)),
        emptyList(), Cursor(0, 1), null,
    )

    @Test fun conLaSesionDeOtraRutinaElHeroSeBloqueaYSeVuelveAEsaSesion() {
        var started = 0
        var continued = 0
        compose.setContent {
            FitTrainerTheme {
                TodayBody(
                    TodayUiState(content = TodayContent.Training(legs), today = LocalDate.of(2026, 11, 2)),
                    activeWorkout = chestWorkout,
                    onStartWorkout = { started++ },
                    onContinueWorkout = { continued++ },
                    onRefresh = {},
                    onDismissNotice = {},
                )
            }
        }

        compose.onNodeWithText("Empezar").assertIsNotEnabled()
        compose.onNodeWithText("Tenés una sesión abierta de Pecho, terminala primero").assertExists()
        compose.onNodeWithText("Sesión en curso de Pecho").assertExists()

        compose.onNodeWithText("Continuar sesión").performClick()
        assertEquals(1, continued)
        assertEquals(0, started)
    }
}
