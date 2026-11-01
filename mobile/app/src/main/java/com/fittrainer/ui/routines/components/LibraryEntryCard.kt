package com.fittrainer.ui.routines.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Entrada fija a la biblioteca: se ve aunque no haya rutinas ni red. */
@Composable
fun LibraryEntryCard(onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .clip(MaterialTheme.shapes.medium)
            .background(FtColors.Card)
            .clickable(onClickLabel = "Abrir la biblioteca", role = Role.Button, onClick = onClick)
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text("Biblioteca de ejercicios", style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
            Text("Todos los ejercicios de tu entrenador", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = FtColors.TextSecondary)
    }
}
