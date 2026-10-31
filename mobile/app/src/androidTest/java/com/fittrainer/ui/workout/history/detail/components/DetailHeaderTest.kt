package com.fittrainer.ui.workout.history.detail.components

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.workout.history.HistoryDetail
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.ui.theme.FitTrainerTheme
import java.time.Instant
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DetailHeaderTest {
    @get:Rule val compose = createComposeRule()

    private val detail = HistoryDetail(
        item = HistoryItem("w1", Instant.parse("2026-10-30T12:00:00Z"), 50, "Push", 12, 1500.0, 7, false, true, HistoryOrigin.SERVER),
        notes = "Me costó el último press",
        trainerComment = "Muy bien, subí 2,5 kg la semana que viene",
        exercises = emptyList(),
        detailLoaded = true,
    )

    @Test fun muestraRutinaRpeConSuEtiquetaYLaNotaDelAlumno() {
        compose.setContent { FitTrainerTheme { DetailHeader(detail) } }
        compose.onNodeWithText("Push").assertIsDisplayed()
        compose.onNodeWithText("RPE 7 · Difícil, te quedaban 2-3 reps").assertIsDisplayed()
        compose.onNodeWithText("Me costó el último press").assertIsDisplayed()
    }

    @Test fun unRpeFueraDeRangoNoSeMuestraNiRompe() {
        compose.setContent { FitTrainerTheme { DetailHeader(detail.copy(item = detail.item.copy(rpe = 15))) } }
        compose.onNodeWithText("Push").assertIsDisplayed()
        compose.onNodeWithText("RPE", substring = true).assertDoesNotExist()
    }

    @Test fun unaRechazadaPorElServidorDiceNoSePudoSubir() {
        compose.setContent { FitTrainerTheme { DetailHeader(detail.copy(item = detail.item.copy(origin = HistoryOrigin.LOCAL_FAILED))) } }
        compose.onNodeWithText("No se pudo subir").assertIsDisplayed()
        compose.onNodeWithText("Sin subir").assertDoesNotExist()
    }

    @Test fun muestraElComentarioDelEntrenador() {
        compose.setContent { FitTrainerTheme { TrainerCommentCard(detail.trainerComment!!) } }
        compose.onNodeWithText("Comentario de tu entrenador").assertIsDisplayed()
        compose.onNodeWithText("Muy bien, subí 2,5 kg la semana que viene").assertIsDisplayed()
    }
}
