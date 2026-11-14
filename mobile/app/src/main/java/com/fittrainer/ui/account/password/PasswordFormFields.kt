package com.fittrainer.ui.account.password

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.account.HIDE_PASSWORD
import com.fittrainer.ui.account.LABEL_NEW_PASSWORD
import com.fittrainer.ui.account.NEEDS_CONNECTION
import com.fittrainer.ui.account.PASSWORD_HELP
import com.fittrainer.ui.account.SAVE
import com.fittrainer.ui.account.SHOW_PASSWORD
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator

/** Las etiquetas que cambian entre Cambiar contraseña y la clave temporal (GX1-M1). */
data class PasswordLabels(val current: String, val repeat: String)

/** Lo que hace cada campo y el botón del [PasswordForm]. */
class PasswordFormActions(
    val onCurrent: (String) -> Unit,
    val onNew: (String) -> Unit,
    val onRepeat: (String) -> Unit,
    val onSave: () -> Unit,
)

/** El aviso sin red, el error general, las tres claves y "Guardar". Va adentro de la columna de cada pantalla. */
@Composable
fun PasswordFormFields(state: ChangePasswordUiState, labels: PasswordLabels, actions: PasswordFormActions) {
    var visible by rememberSaveable { mutableStateOf(false) }
    if (state.offline) OfflineIndicator(NEEDS_CONNECTION)
    state.error?.let { NoticeBanner(it) }
    val toggle = @Composable {
        // Sin el ícono del ojo (no está en Material Icons core): un botón de texto se entiende igual.
        TextButton(onClick = { visible = !visible }) { Text(if (visible) HIDE_PASSWORD else SHOW_PASSWORD) }
    }
    PasswordField(labels.current, state.current, actions.onCurrent, state.currentError, visible, toggle)
    PasswordField(LABEL_NEW_PASSWORD, state.new, actions.onNew, state.newError ?: PASSWORD_HELP, visible, toggle, state.newError != null)
    PasswordField(labels.repeat, state.repeat, actions.onRepeat, state.repeatError, visible, toggle)
    Button(onClick = actions.onSave, enabled = state.canSave, modifier = Modifier.fillMaxWidth().height(56.dp)) {
        Text(if (state.saving) "Guardando…" else SAVE)
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
