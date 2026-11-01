package com.fittrainer.ui.workout.history.components

import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.ui.theme.FitTrainerTheme
import com.fittrainer.ui.workout.history.HistoryFilter
import com.fittrainer.ui.workout.history.HistoryUiState
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HistoryFilterRowTest {
    @get:Rule val compose = createComposeRule()

    @Test fun estaSemanaVieneElegidaYTocarTodosAvisa() {
        var picked: HistoryFilter? = null
        compose.setContent { FitTrainerTheme { HistoryFilterRow(HistoryFilter.WEEK, showPending = false) { picked = it } } }
        compose.onNodeWithText("Esta semana").assertIsSelected()
        compose.onAllNodesWithText("Sin subir").assertCountEquals(0)
        compose.onNodeWithText("Todos").performClick()
        assertEquals(HistoryFilter.ALL, picked)
    }

    @Test fun sinSubirApareceSoloSiHayAlgo() {
        compose.setContent { FitTrainerTheme { HistoryFilterRow(HistoryFilter.WEEK, showPending = true) {} } }
        compose.onNode(hasScrollAction()).performScrollToNode(hasText("Sin subir")) // la fila se desliza: es el último chip
        compose.onNodeWithText("Sin subir").assertIsDisplayed()
    }

    @Test fun comentadosMuestraElBadgeConLaCantidadSinLeer() {
        compose.setContent { FitTrainerTheme { HistoryFilterRow(HistoryFilter.WEEK, showPending = false, unreadComments = 2) {} } }
        compose.onNodeWithText("2").assertIsDisplayed()
        compose.onNodeWithContentDescription("Comentados, 2 sin leer").assertIsDisplayed()
    }

    @Test fun conCeroNoHayBadgeNiAvisoDeSinLeer() {
        compose.setContent { FitTrainerTheme { HistoryFilterRow(HistoryFilter.WEEK, showPending = false, unreadComments = 0) {} } }
        compose.onAllNodesWithText("0").assertCountEquals(0)
        compose.onAllNodesWithContentDescription("Comentados, 0 sin leer").assertCountEquals(0)
        compose.onNodeWithText("Comentados 💬").assertIsDisplayed()
    }

    @Test fun masDeNueveMuestraNuevePlus() {
        compose.setContent { FitTrainerTheme { HistoryFilterRow(HistoryFilter.WEEK, showPending = false, unreadComments = 12) {} } }
        compose.onNodeWithText("9+").assertIsDisplayed()
    }

    @Test fun elVacioDeEstaSemanaOfreceVerTodos() {
        var clicks = 0
        val state = HistoryUiState(everLoaded = true, filter = HistoryFilter.WEEK)
        compose.setContent { FitTrainerTheme { LazyColumn { HistoryEmptyState(state) { clicks++ } } } }
        compose.onNodeWithText("Sin entrenamientos esta semana").assertIsDisplayed()
        compose.onNodeWithText("Ver todos").performClick()
        assertEquals(1, clicks)
    }
}
