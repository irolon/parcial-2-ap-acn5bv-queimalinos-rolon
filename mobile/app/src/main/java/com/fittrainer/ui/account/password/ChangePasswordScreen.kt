package com.fittrainer.ui.account.password

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.account.CHANGE_PASSWORD
import com.fittrainer.ui.account.LABEL_CURRENT_PASSWORD
import com.fittrainer.ui.account.LABEL_REPEAT_PASSWORD
import com.fittrainer.ui.account.components.BackHeader
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Cambiar contraseña. [onDone] vuelve a Perfil / Más, que muestra "Contraseña actualizada". */
@Composable
fun ChangePasswordScreen(onBack: () -> Unit, onDone: () -> Unit, viewModel: ChangePasswordViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(state.done) { if (state.done) onDone() }
    Column(
        Modifier.fillMaxSize().background(FtColors.Background).verticalScroll(rememberScrollState()).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        BackHeader(CHANGE_PASSWORD, onBack)
        PasswordFormFields(
            state,
            PasswordLabels(LABEL_CURRENT_PASSWORD, LABEL_REPEAT_PASSWORD),
            PasswordFormActions(viewModel::onCurrent, viewModel::onNew, viewModel::onRepeat, viewModel::onSave),
        )
    }
}
