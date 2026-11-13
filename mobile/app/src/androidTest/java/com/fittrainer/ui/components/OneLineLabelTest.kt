package com.fittrainer.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.DeviceConfigurationOverride
import androidx.compose.ui.test.FontScale
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.ui.theme.FitTrainerTheme
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Barra de abajo del Galaxy S10 con zoom grande: cada pestaña mide ~58 dp y "Progreso" se cortaba en "Progre". */
@RunWith(AndroidJUnit4::class)
class OneLineLabelTest {

    @get:Rule val compose = createComposeRule()

    @Test fun siNoEntraAchicaLaLetraEnVezDeCortarLaPalabra() {
        compose.setContent {
            DeviceConfigurationOverride(DeviceConfigurationOverride.FontScale(1.1f)) {
                FitTrainerTheme {
                    ProvideTextStyle(MaterialTheme.typography.labelMedium) {
                        Box(Modifier.width(58.dp)) { OneLineLabel("Progreso", minSize = 8.sp) }
                    }
                }
            }
        }

        val layouts = mutableListOf<TextLayoutResult>()
        compose.onNodeWithText("Progreso").fetchSemanticsNode().config[SemanticsActions.GetTextLayoutResult].action?.invoke(layouts)
        val layout = layouts.first()
        assertFalse("se corta: a 12 sp \"Progreso\" necesita ~72 dp", layout.didOverflowWidth || layout.didOverflowHeight)
    }
}
