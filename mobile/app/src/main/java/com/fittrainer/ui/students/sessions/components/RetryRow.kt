package com.fittrainer.ui.students.sessions.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Un error que no es de red, con "Reintentar". Lo guardado sigue a la vista. */
@Composable
fun RetryRow(message: String, onRetry: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Text(message, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
        TextButton(onClick = onRetry, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") }
    }
}
