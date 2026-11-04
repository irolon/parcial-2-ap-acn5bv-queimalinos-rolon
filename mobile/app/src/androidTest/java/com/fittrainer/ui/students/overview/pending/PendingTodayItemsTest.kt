package com.fittrainer.ui.students.overview.pending

import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.students.overview.TodayItem
import com.fittrainer.ui.theme.FitTrainerTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** E12: los pendientes de hoy dentro del centro de avisos (antes, la hoja de la campana del Inicio). */
@RunWith(AndroidJUnit4::class)
class PendingTodayItemsTest {

    @get:Rule val compose = createComposeRule()

    @Test fun conVeinticincoPendientesSeLlegaAlUltimoYAbreSuFicha() {
        val pending = (1..25).map { TodayItem("s$it", "Alumno $it", true, false, null, null, null, null) }
        var opened: String? = null
        compose.setContent {
            FitTrainerTheme { LazyColumn(Modifier.testTag(LIST)) { pendingTodayItems(pending) { opened = it } } }
        }

        compose.onNodeWithText("Pendientes de hoy").assertExists()
        compose.onNodeWithTag(LIST).performScrollToNode(hasText("Alumno 25"))
        compose.onNodeWithText("Alumno 25").performClick()

        assertEquals("s25", opened)
    }

    @Test fun sinPendientesNoHaySeccion() {
        compose.setContent { FitTrainerTheme { LazyColumn { pendingTodayItems(emptyList()) {} } } }
        compose.onNodeWithText("Pendientes de hoy").assertDoesNotExist()
    }

    private companion object {
        const val LIST = "list"
    }
}
