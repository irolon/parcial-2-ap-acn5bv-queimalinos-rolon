package com.fittrainer.ui.account.forced

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.account.FORCED_PASSWORD_TEXT
import com.fittrainer.ui.account.FORCED_PASSWORD_TITLE
import com.fittrainer.ui.account.LABEL_REPEAT_NEW_PASSWORD
import com.fittrainer.ui.account.LABEL_TEMPORARY_PASSWORD
import com.fittrainer.ui.account.SIGN_OUT
import com.fittrainer.ui.account.password.ChangePasswordUiState
import com.fittrainer.ui.account.password.PasswordFormActions
import com.fittrainer.ui.account.password.PasswordFormFields
import com.fittrainer.ui.account.password.PasswordLabels
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * "Elegí una contraseña nueva" (GX1-M1): la raíz la muestra en lugar de las pestañas mientras el alumno tenga la marca
 * de clave temporal. No tiene salida más que guardar o [onSignOut], el cierre de sesión de siempre.
 */
@Composable
fun ForcedPasswordScreen(onSignOut: () -> Unit, viewModel: ForcedPasswordViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    ForcedPasswordContent(
        state,
        PasswordFormActions(viewModel::onCurrent, viewModel::onNew, viewModel::onRepeat, viewModel::onSave),
        onSignOut,
    )
}

/** Sin estado: el texto, las tres claves, "Guardar" y "Cerrar sesión". Con scroll, para pantallas chicas. */
@Composable
fun ForcedPasswordContent(state: ChangePasswordUiState, actions: PasswordFormActions, onSignOut: () -> Unit) {
    Column(
        Modifier.fillMaxSize().background(FtColors.Background).verticalScroll(rememberScrollState()).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Text(FORCED_PASSWORD_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
        Text(FORCED_PASSWORD_TEXT, style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary)
        PasswordFormFields(state, PasswordLabels(LABEL_TEMPORARY_PASSWORD, LABEL_REPEAT_NEW_PASSWORD), actions)
        TextButton(
            onClick = onSignOut,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text(SIGN_OUT, color = FtColors.Coral) }
    }
}
