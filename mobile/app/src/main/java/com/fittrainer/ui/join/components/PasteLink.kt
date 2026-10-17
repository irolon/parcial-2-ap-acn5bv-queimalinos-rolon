package com.fittrainer.ui.join.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing

@Composable
internal fun PasteLink(link: String, error: String?, onLinkChange: (String) -> Unit, onSubmit: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Text("O PEGÁ EL LINK DE LA INVITACIÓN", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        OutlinedTextField(
            value = link,
            onValueChange = onLinkChange,
            singleLine = true,
            isError = error != null,
            supportingText = if (error != null) {
                { Text(error) }
            } else {
                null
            },
            placeholder = { Text("https://…/join?token=…") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Go),
            keyboardActions = KeyboardActions(onGo = { onSubmit() }),
            shape = RoundedCornerShape(FtRadius.control),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedButton(
            onClick = onSubmit,
            enabled = link.isNotBlank(),
            shape = RoundedCornerShape(FtRadius.control),
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Continuar") }
    }
}
