package com.fittrainer.ui.account.edit

import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.account.PHONE_ERROR
import com.fittrainer.data.account.ProfileField
import com.fittrainer.data.session.Role
import com.fittrainer.ui.account.CHANGE_PHOTO
import com.fittrainer.ui.account.LABEL_TITLE
import com.fittrainer.ui.account.NEEDS_CONNECTION
import com.fittrainer.ui.account.PROFILE_LOAD_FAILED
import com.fittrainer.ui.account.SAVE
import com.fittrainer.ui.theme.FitTrainerTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class EditProfileContentTest {

    @get:Rule val compose = createComposeRule()

    private val actions = EditProfileActions({}, {}, {}, {}, {}, {})

    private fun show(state: EditProfileUiState) = compose.setContent { FitTrainerTheme { EditProfileContent(state, actions) {} } }

    private val student = EditProfileUiState(
        loaded = true, role = Role.STUDENT, form = EditProfileForm("Ana", "12"), email = "ana@test.com",
    )

    @Test fun elErrorDelTelefonoSeVeDebajoDelCampo() {
        show(student.copy(fieldErrors = mapOf(ProfileField.PHONE to PHONE_ERROR)))
        compose.onNodeWithText(PHONE_ERROR).performScrollTo()
        compose.onNodeWithText(CHANGE_PHOTO).performScrollTo()
    }

    @Test fun sinRedAvisaYGuardarQuedaApagado() {
        show(student.copy(offline = true, canSave = false))
        compose.onNodeWithText(NEEDS_CONNECTION).performScrollTo()
        compose.onNodeWithText(SAVE).performScrollTo().assertIsNotEnabled()
    }

    @Test fun elEntrenadorNoTieneFotoYSiTitulo() {
        show(EditProfileUiState(loaded = true, role = Role.TRAINER, form = EditProfileForm("Profe"), email = "p@test.com"))
        compose.onNodeWithText(LABEL_TITLE).performScrollTo()
        compose.onNodeWithText(CHANGE_PHOTO).assertDoesNotExist()
    }

    @Test fun sinPerfilBajadoSeVeElAvisoYNoElFormulario() {
        show(EditProfileUiState(loaded = false, error = PROFILE_LOAD_FAILED))
        compose.onNodeWithText(PROFILE_LOAD_FAILED).performScrollTo()
        compose.onNodeWithText(SAVE).assertDoesNotExist()
    }
}
