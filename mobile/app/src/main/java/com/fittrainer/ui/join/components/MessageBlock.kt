package com.fittrainer.ui.join.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.join.InvitationMessage
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing

/** Mensaje de error con la acción que corresponde: reintentar o ir al login. */
@Composable
internal fun MessageBlock(message: InvitationMessage, onRetry: () -> Unit, onLogin: () -> Unit) {
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
