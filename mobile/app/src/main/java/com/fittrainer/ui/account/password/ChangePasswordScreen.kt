package com.fittrainer.ui.account.password

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
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.account.CHANGE_PASSWORD
import com.fittrainer.ui.account.HIDE_PASSWORD
import com.fittrainer.ui.account.LABEL_CURRENT_PASSWORD
import com.fittrainer.ui.account.LABEL_NEW_PASSWORD
import com.fittrainer.ui.account.LABEL_REPEAT_PASSWORD
import com.fittrainer.ui.account.NEEDS_CONNECTION
import com.fittrainer.ui.account.PASSWORD_HELP
import com.fittrainer.ui.account.SAVE
import com.fittrainer.ui.account.SHOW_PASSWORD
import com.fittrainer.ui.account.components.BackHeader
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Cambiar contraseña. [onDone] vuelve a Perfil / Más, que muestra "Contraseña actualizada". */
@Composable
fun ChangePasswordScreen(onBack: () -> Unit, onDone: () -> Unit, viewModel: ChangePasswordViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(state.done) { if (state.done) onDone() }
    var visible by rememberSaveable { mutableStateOf(false) }
    Column(
        Modifier.fillMaxSize().background(FtColors.Background).verticalScroll(rememberScrollState()).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        BackHeader(CHANGE_PASSWORD, onBack)
        if (state.offline) OfflineIndicator(NEEDS_CONNECTION)
        state.error?.let { NoticeBanner(it) }
        val toggle = @Composable {
            // Sin el ícono del ojo (no está en Material Icons core): un botón de texto se entiende igual.
            TextButton(onClick = { visible = !visible }) { Text(if (visible) HIDE_PASSWORD else SHOW_PASSWORD) }
        }
        PasswordField(LABEL_CURRENT_PASSWORD, state.current, viewModel::onCurrent, state.currentError, visible, toggle)
        PasswordField(LABEL_NEW_PASSWORD, state.new, viewModel::onNew, state.newError ?: PASSWORD_HELP, visible, toggle, state.newError != null)
        PasswordField(LABEL_REPEAT_PASSWORD, state.repeat, viewModel::onRepeat, state.repeatError, visible, toggle)
        Button(onClick = viewModel::onSave, enabled = state.canSave, modifier = Modifier.fillMaxWidth().height(56.dp)) {
            Text(if (state.saving) "Guardando…" else SAVE)
        }
    }
}

@Composable
private fun PasswordField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    supporting: String?,
    visible: Boolean,
    toggle: @Composable () -> Unit,
    isError: Boolean = supporting != null,
) {
    OutlinedTextField(
        value, onChange, Modifier.fillMaxWidth(),
        label = { Text(label) },
        isError = isError,
        supportingText = supporting?.let { { Text(it) } },
        singleLine = true,
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        trailingIcon = toggle,
    )
}
