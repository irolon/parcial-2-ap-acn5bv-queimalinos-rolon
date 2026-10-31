package com.fittrainer.ui.workout.history.components

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

    private fun item(unread: Boolean) = HistoryItem(
        "w1", Instant.parse("2026-10-30T12:00:00Z"), 50, "Push", 12, 1500.0, 7, false, true, HistoryOrigin.SERVER, commentUnread = unread,
    )

    @Test fun conComentarioSinLeerMuestraNuevo() {
        compose.setContent { FitTrainerTheme { HistoryCard(item(unread = true), ZoneId.of("UTC"), onClick = {}) } }
        compose.onNodeWithText("💬 Nuevo").assertIsDisplayed()
    }

    @Test fun conComentarioLeidoMuestraSoloElIcono() {
        compose.setContent { FitTrainerTheme { HistoryCard(item(unread = false), ZoneId.of("UTC"), onClick = {}) } }
        compose.onNodeWithText("RPE 7  💬").assertIsDisplayed()
    }
}
