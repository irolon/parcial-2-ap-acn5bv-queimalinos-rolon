package com.fittrainer.ui.students.overview.components

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

/** La hoja de la campana con muchos pendientes: el último se alcanza con scroll y abre su ficha. */
@RunWith(AndroidJUnit4::class)
class PendingTodayListTest {

    @get:Rule val compose = createComposeRule()

    @Test fun conVeinticincoPendientesSeLlegaAlUltimoYAbreSuFicha() {
        val pending = (1..25).map { TodayItem("s$it", "Alumno $it", true, false, null, null, null, null) }
        var opened: String? = null
        compose.setContent { FitTrainerTheme { PendingTodayList(pending) { opened = it } } }

        compose.onNodeWithTag(PENDING_TODAY_LIST_TAG).performScrollToNode(hasText("Alumno 25"))
        compose.onNodeWithText("Alumno 25").performClick()

        assertEquals("s25", opened)
    }

    @Test fun sinPendientesMuestraElAviso() {
        compose.setContent { FitTrainerTheme { PendingTodayList(emptyList()) {} } }
        compose.onNodeWithText("Nadie te debe el entrenamiento de hoy.").assertExists()
    }
}
