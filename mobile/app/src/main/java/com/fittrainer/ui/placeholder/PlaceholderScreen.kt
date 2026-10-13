package com.fittrainer.ui.placeholder

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Pestaña todavía sin implementar. */
@Composable
fun PlaceholderScreen(title: String) {
    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(title, style = MaterialTheme.typography.displayMedium)
        Text("PRÓXIMAMENTE", style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
    }
}
