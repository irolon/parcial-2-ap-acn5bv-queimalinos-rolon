package com.fittrainer.ui.account.forced

import androidx.compose.ui.test.DeviceConfigurationOverride
import androidx.compose.ui.test.FontScale
import androidx.compose.ui.test.ForcedSize
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.then
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.ui.account.FORCED_PASSWORD_TEXT
import com.fittrainer.ui.account.FORCED_PASSWORD_TITLE
import com.fittrainer.ui.account.LABEL_NEW_PASSWORD
import com.fittrainer.ui.account.LABEL_REPEAT_NEW_PASSWORD
import com.fittrainer.ui.account.LABEL_TEMPORARY_PASSWORD
import com.fittrainer.ui.account.SIGN_OUT
import com.fittrainer.ui.account.password.ChangePasswordUiState
import com.fittrainer.ui.account.password.PasswordFormActions
import com.fittrainer.ui.theme.FitTrainerTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** GX1-M1: la pantalla de la clave temporal, en pantalla chica (Galaxy S10 con zoom grande), con scroll hasta el final. */
@RunWith(AndroidJUnit4::class)
class ForcedPasswordContentTest {

    @get:Rule val compose = createComposeRule()

    private var signedOut = 0

    private fun show(state: ChangePasswordUiState = ChangePasswordUiState()) = compose.setContent {
        DeviceConfigurationOverride(
            DeviceConfigurationOverride.ForcedSize(DpSize(320.dp, 560.dp)) then DeviceConfigurationOverride.FontScale(1.1f),
        ) {
            FitTrainerTheme {
                ForcedPasswordContent(state, PasswordFormActions({}, {}, {}, {}), onSignOut = { signedOut++ })
            }
        }
    }

    @Test fun muestraElTextoLosTresCamposYCerrarSesion() {
        show()
        compose.onNodeWithText(FORCED_PASSWORD_TITLE).assertIsDisplayed()
        compose.onNodeWithText(FORCED_PASSWORD_TEXT).assertIsDisplayed()
        for (label in listOf(LABEL_TEMPORARY_PASSWORD, LABEL_NEW_PASSWORD, LABEL_REPEAT_NEW_PASSWORD, SIGN_OUT)) {
            compose.onNodeWithText(label).performScrollTo().assertIsDisplayed()
        }
    }

    @Test fun cerrarSesionUsaElCierreDeSiempre() {
        show()
        compose.onNodeWithText(SIGN_OUT).performScrollTo().performClick()
        assertEquals(1, signedOut)
    }
}
