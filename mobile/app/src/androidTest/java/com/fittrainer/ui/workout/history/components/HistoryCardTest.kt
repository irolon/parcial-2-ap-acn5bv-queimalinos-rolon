package com.fittrainer.ui.workout.history.components

import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.ui.theme.FitTrainerTheme
import java.time.Instant
import java.time.ZoneId
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HistoryCardTest {
    @get:Rule val compose = createComposeRule()

    private fun item(unread: Boolean, origin: HistoryOrigin = HistoryOrigin.SERVER) = HistoryItem(
        "w1", Instant.parse("2026-10-30T12:00:00Z"), 50, "Push", 12, 1500.0, 7, false, true, origin, commentUnread = unread,
    )

    @Test fun marcaSinSubirYNoSePudoSubir() {
        compose.setContent { FitTrainerTheme { HistoryCard(item(false, HistoryOrigin.LOCAL_FAILED), ZoneId.of("UTC"), onClick = {}) } }
        compose.onNodeWithText("No se pudo subir").assertIsDisplayed()
        compose.onNodeWithText("Sin subir").assertDoesNotExist()
    }

    @Test fun laTarjetaDiceQueAbreElDetalle() {
        compose.setContent { FitTrainerTheme { HistoryCard(item(false), ZoneId.of("UTC"), onClick = {}) } }
        compose.onNode(SemanticsMatcher("onClickLabel Ver detalle") { it.config.getOrNull(SemanticsActions.OnClick)?.label == "Ver detalle" })
            .assertExists()
    }

    @Test fun conComentarioSinLeerMuestraNuevo() {
        compose.setContent { FitTrainerTheme { HistoryCard(item(unread = true), ZoneId.of("UTC"), onClick = {}) } }
        compose.onNodeWithText("💬 Nuevo").assertIsDisplayed()
    }

    @Test fun conComentarioLeidoMuestraSoloElIcono() {
        compose.setContent { FitTrainerTheme { HistoryCard(item(unread = false), ZoneId.of("UTC"), onClick = {}) } }
        compose.onNodeWithText("RPE 7  💬").assertIsDisplayed()
    }
}
