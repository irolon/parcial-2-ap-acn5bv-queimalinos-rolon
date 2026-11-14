package com.fittrainer.ui.account.edit

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.account.ProfileField
import com.fittrainer.data.session.Role
import com.fittrainer.ui.account.EDIT_PROFILE
import com.fittrainer.ui.account.EMAIL_HELP
import com.fittrainer.ui.account.LABEL_EMAIL
import com.fittrainer.ui.account.LABEL_NAME
import com.fittrainer.ui.account.LABEL_PHONE
import com.fittrainer.ui.account.LABEL_TITLE
import com.fittrainer.ui.account.NEEDS_CONNECTION
import com.fittrainer.ui.account.PROFILE_LOADING
import com.fittrainer.ui.account.SAVE
import com.fittrainer.ui.account.TITLE_HELP
import com.fittrainer.ui.account.TITLE_PLACEHOLDER
import com.fittrainer.ui.account.components.BackHeader
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Lo que la pantalla le pide al ViewModel (separado para los tests de UI). */
class EditProfileActions(
    val onName: (String) -> Unit,
    val onPhone: (String) -> Unit,
    val onTitle: (String) -> Unit,
    val onSave: () -> Unit,
    val onPickPhoto: () -> Unit,
    val onRemovePhoto: () -> Unit,
)

/** Editar perfil: el alumno, foto, nombre y teléfono; el entrenador, nombre y título. Guardar vuelve al menú. */
@Composable
fun EditProfileScreen(onBack: () -> Unit, viewModel: EditProfileViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(state.saved) { if (state.saved) onBack() }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { viewModel.onPhotoPicked(it.toString()) }
    }
    val actions = EditProfileActions(
        viewModel::onName, viewModel::onPhone, viewModel::onTitle, viewModel::onSave,
        onPickPhoto = { gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
        onRemovePhoto = viewModel::onRemovePhoto,
    )
    EditProfileContent(state, actions, onBack)
}

@Composable
fun EditProfileContent(state: EditProfileUiState, actions: EditProfileActions, onBack: () -> Unit) {
    Column(
        Modifier.fillMaxSize().background(FtColors.Background).verticalScroll(rememberScrollState()).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        BackHeader(EDIT_PROFILE, onBack)
        if (state.offline) OfflineIndicator(NEEDS_CONNECTION)
        state.error?.let { NoticeBanner(it) }
        if (!state.loaded) {
            if (!state.offline && state.error == null) Text(PROFILE_LOADING, color = FtColors.TextSecondary)
            return@Column
        }
        if (state.role == Role.STUDENT) PhotoRow(state, actions)
        val e = state.fieldErrors
        Field(LABEL_NAME, state.form.name, actions.onName, e[ProfileField.NAME])
        if (state.role == Role.STUDENT) Field(LABEL_PHONE, state.form.phone, actions.onPhone, e[ProfileField.PHONE], KeyboardType.Phone)
        if (state.role == Role.TRAINER) {
            Field(LABEL_TITLE, state.form.title, actions.onTitle, e[ProfileField.TITLE], help = TITLE_HELP, placeholder = TITLE_PLACEHOLDER)
        }
        OutlinedTextField(
            state.email, {}, Modifier.fillMaxWidth(), enabled = false, singleLine = true,
            label = { Text(LABEL_EMAIL) }, supportingText = { Text(EMAIL_HELP) },
        )
        Button(onClick = actions.onSave, enabled = state.canSave, modifier = Modifier.fillMaxWidth().height(56.dp)) {
            Text(if (state.saving) "Guardando…" else SAVE)
        }
    }
}

@Composable
private fun Field(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    error: String?,
    keyboard: KeyboardType = KeyboardType.Text,
    help: String? = null,
    placeholder: String? = null,
) {
    OutlinedTextField(
        value, onChange, Modifier.fillMaxWidth(),
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        isError = error != null,
        supportingText = (error ?: help)?.let { { Text(it) } },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
    )
}
