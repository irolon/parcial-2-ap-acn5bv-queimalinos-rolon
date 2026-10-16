package com.fittrainer.ui.join

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.invitation.Invitation
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val EXPIRES_FORMAT = DateTimeFormatter.ofPattern("dd/MM HH:mm")

@Composable
fun ConfirmInvitationScreen(onClose: () -> Unit, viewModel: ConfirmInvitationViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg),
    ) {
        IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = "Cerrar") }
        when (val s = state) {
            ConfirmInvitationUiState.Loading -> Box(Modifier.fillMaxWidth().padding(Spacing.xxl), Alignment.Center) {
                CircularProgressIndicator()
            }
            is ConfirmInvitationUiState.Error -> MessageBlock(s.message, onRetry = viewModel::retry, onLogin = onClose)
            is ConfirmInvitationUiState.Ready -> ReadyContent(
                state = s,
                onPasswordChange = viewModel::onPasswordChange,
                onSubmit = viewModel::submit,
                onLogin = onClose,
            )
        }
    }
}

@Composable
private fun ReadyContent(
    state: ConfirmInvitationUiState.Ready,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onLogin: () -> Unit,
) {
    val invitation = state.invitation
    var showPassword by rememberSaveable { mutableStateOf(false) }

    Text(
        "INVITACIÓN · ${invitation.trainerName.uppercase()}",
        style = MaterialTheme.typography.labelSmall,
        color = FtColors.TextPrimary,
        modifier = Modifier
            .background(FtColors.Brand, RoundedCornerShape(FtRadius.chip))
            .padding(horizontal = Spacing.sm, vertical = Spacing.xs),
    )
    Text(
        buildAnnotatedString {
            append("Todo listo,\n")
            withStyle(SpanStyle(color = FtColors.BrandText)) { append(invitation.studentName.substringBefore(' ') + ".") }
        },
        style = MaterialTheme.typography.displayLarge,
    )
    Text(
        "${invitation.trainerName} ya cargó tu perfil. Confirmá los datos y elegí contraseña.",
        style = MaterialTheme.typography.bodyLarge,
        color = FtColors.TextSecondary,
    )

    PrefilledCard(invitation)

    Text("ELEGÍ UNA CONTRASEÑA", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    OutlinedTextField(
        value = state.password,
        onValueChange = onPasswordChange,
        enabled = !state.isSubmitting,
        singleLine = true,
        supportingText = { Text("Mínimo $MIN_PASSWORD_LENGTH caracteres") },
        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
        trailingIcon = {
            TextButton(
                onClick = { showPassword = !showPassword },
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
            ) { Text(if (showPassword) "Ocultar" else "Mostrar", color = FtColors.BrandText) }
        },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { onSubmit() }),
        shape = RoundedCornerShape(FtRadius.control),
        modifier = Modifier.fillMaxWidth(),
    )

    Button(
        onClick = onSubmit,
        enabled = state.canSubmit,
        shape = RoundedCornerShape(FtRadius.control),
        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
    ) {
        if (state.isSubmitting) {
            CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
        } else {
            Text("→ Entrar a FitTrainer")
        }
    }

    state.submitError?.let { MessageBlock(it, onRetry = onSubmit, onLogin = onLogin) }
}

@Composable
private fun PrefilledCard(invitation: Invitation) {
    val expires = invitation.expiresAt.atZone(ZoneId.systemDefault()).format(EXPIRES_FORMAT)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(FtColors.Card, RoundedCornerShape(FtRadius.card))
            .border(1.dp, FtColors.Border, RoundedCornerShape(FtRadius.card))
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text("PRECARGADO", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        DataRow("Nombre", invitation.studentName)
        HorizontalDivider(color = FtColors.Border)
        DataRow("Email", invitation.studentEmail)
        HorizontalDivider(color = FtColors.Border)
        DataRow("Objetivo", goalLabel(invitation.goal))
        HorizontalDivider(color = FtColors.Border)
        DataRow("Vence", expires)
    }
}

@Composable
private fun DataRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
    }
}

/** Mensaje de error con la acción que corresponde: reintentar o ir al login. */
@Composable
private fun MessageBlock(message: InvitationMessage, onRetry: () -> Unit, onLogin: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Text(message.text, style = MaterialTheme.typography.bodyMedium, color = FtColors.Coral)
        if (message.canRetry) {
            OutlinedButton(
                onClick = onRetry,
                shape = RoundedCornerShape(FtRadius.control),
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            ) { Text("Reintentar") }
        }
        if (message.offerLogin) {
            OutlinedButton(
                onClick = onLogin,
                shape = RoundedCornerShape(FtRadius.control),
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            ) { Text("Iniciar sesión") }
        }
    }
}
