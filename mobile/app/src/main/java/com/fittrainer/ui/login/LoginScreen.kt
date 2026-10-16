package com.fittrainer.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing

@Composable
fun LoginScreen(
    viewModel: LoginViewModel = hiltViewModel(),
    warning: String? = null,
    onDismissWarning: () -> Unit = {},
    onJoin: () -> Unit = {},
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LoginContent(
        state = state,
        onEmailChange = viewModel::onEmailChange,
        onPasswordChange = viewModel::onPasswordChange,
        onSubmit = viewModel::submit,
        warning = warning,
        onDismissWarning = onDismissWarning,
        onJoin = onJoin,
    )
}

@Composable
fun LoginContent(
    state: LoginUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    warning: String? = null,
    onDismissWarning: () -> Unit = {},
    onJoin: () -> Unit = {},
) {
    var showPassword by rememberSaveable { mutableStateOf(false) }
    val controlShape = RoundedCornerShape(FtRadius.control)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg, Alignment.CenterVertically),
    ) {
        Text("FitTrainer", style = MaterialTheme.typography.displayLarge)
        Text("Iniciá sesión", style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary)

        // Aviso no bloqueante (p. ej. un logout que no se pudo guardar): el formulario sigue usable.
        warning?.let {
            Column {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.Amber)
                TextButton(
                    onClick = onDismissWarning,
                    modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                ) { Text("Entendido", color = FtColors.BrandText) }
            }
        }

        OutlinedTextField(
            value = state.email,
            onValueChange = onEmailChange,
            enabled = !state.isLoading,
            label = { Text("Email") },
            singleLine = true,
            isError = state.emailError != null,
            supportingText = if (state.emailError != null) {
                { Text(state.emailError) }
            } else {
                null
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            shape = controlShape,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = state.password,
            onValueChange = onPasswordChange,
            enabled = !state.isLoading,
            label = { Text("Contraseña") },
            singleLine = true,
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                TextButton(
                    onClick = { showPassword = !showPassword },
                    enabled = !state.isLoading,
                    modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                ) { Text(if (showPassword) "Ocultar" else "Mostrar", color = FtColors.BrandText) }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            shape = controlShape,
            modifier = Modifier.fillMaxWidth(),
        )

        Button(
            onClick = onSubmit,
            enabled = state.canSubmit,
            shape = controlShape,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text("Ingresar")
            }
        }

        state.error?.let {
            Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.Coral)
        }

        OutlinedButton(
            onClick = onJoin,
            enabled = !state.isLoading,
            shape = controlShape,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Tengo una invitación") }
    }
}
