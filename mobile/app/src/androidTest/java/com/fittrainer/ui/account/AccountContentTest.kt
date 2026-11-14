package com.fittrainer.ui.account

import androidx.compose.ui.test.DeviceConfigurationOverride
import androidx.compose.ui.test.FontScale
import androidx.compose.ui.test.ForcedSize
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.then
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.session.Role
import com.fittrainer.ui.theme.FitTrainerTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Perfil / Más: la tarjeta con los datos y, en pantalla chica (Galaxy S10 con zoom grande), se llega a todo con scroll. */
@RunWith(AndroidJUnit4::class)
class AccountContentTest {

    @get:Rule val compose = createComposeRule()

    private var signedOut = 0
    private var edits = 0

    private fun show(state: AccountUiState) = compose.setContent {
        val actions = AccountActions(
            roleLinks = listOf(MenuLink("Mis turnos") {}),
            onEdit = { edits++ }, onChangePassword = {}, onNotifications = {}, onServerStatus = {}, onSignOut = { signedOut++ },
        )
        DeviceConfigurationOverride(
            DeviceConfigurationOverride.ForcedSize(DpSize(320.dp, 560.dp)) then DeviceConfigurationOverride.FontScale(1.1f),
        ) {
            FitTrainerTheme { AccountContent("Perfil", state, actions) }
        }
    }

    private val student = AccountUiState(
        role = Role.STUDENT, name = "Ana Pérez", email = "ana@test.com", phone = null, trainerName = "Laura", everLoaded = true,
    )

    @Test fun laTarjetaMuestraLosDatosDelAlumnoYEditar() {
        show(student)
        compose.onNodeWithText("Ana Pérez").assertIsDisplayed()
        compose.onNodeWithText("ana@test.com").assertIsDisplayed()
        compose.onNodeWithText(NO_PHONE).assertIsDisplayed()
        compose.onNodeWithText(trainsWith("Laura")).assertIsDisplayed()
        compose.onNodeWithText(EDIT_PROFILE).performClick()
        assertEquals(1, edits)
    }

    @Test fun enPantallaChicaSeLlegaConScrollACerrarSesion() {
        show(student)
        compose.onNodeWithTag(ACCOUNT_LIST_TAG).performScrollToNode(hasText(SIGN_OUT))
        compose.onNodeWithText(SIGN_OUT).assertIsDisplayed().performClick()
        assertEquals(1, signedOut)
    }

    @Test fun elEntrenadorVeSuTituloYHerramientas() {
        show(AccountUiState(role = Role.TRAINER, name = "Profe", email = "p@test.com", professionalTitle = "Lic. en Ed. Física", everLoaded = true))
        compose.onNodeWithText("LIC. EN ED. FÍSICA").assertIsDisplayed()
        compose.onNodeWithTag(ACCOUNT_LIST_TAG).performScrollToNode(hasText(SECTION_TRAINER.uppercase()))
        compose.onNodeWithText(SECTION_TRAINER.uppercase()).assertIsDisplayed()
    }
}
