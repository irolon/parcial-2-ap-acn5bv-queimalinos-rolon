package com.fittrainer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Ninguno de estos estados es un error: nada de rojo. */
@Composable
fun InfoCard(title: String, message: String) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text(message, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
    }
}

/** Discreto a propósito: sin señal la app tiene que sentirse confiable, no rota. */
@Composable
fun OfflineIndicator(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Box(Modifier.size(6.dp).background(FtColors.Amber, CircleShape))
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            color = FtColors.TextSecondary,
        )
    }
}

@Composable
fun NoticeBanner(message: String, onDismiss: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    Row(
        modifier
            .fillMaxWidth()
            .background(FtColors.Elevated, MaterialTheme.shapes.medium)
            .padding(start = Spacing.md, end = if (onDismiss == null) Spacing.md else Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            message,
            modifier = Modifier.weight(1f).padding(vertical = Spacing.md),
            style = MaterialTheme.typography.bodySmall,
            color = FtColors.TextPrimary,
        )
        if (onDismiss != null) {
            TextButton(onClick = onDismiss, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Text("OK")
            }
        }
    }
}
