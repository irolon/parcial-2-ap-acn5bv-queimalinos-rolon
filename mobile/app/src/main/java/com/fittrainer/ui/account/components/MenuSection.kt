package com.fittrainer.ui.account.components

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
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import com.fittrainer.ui.account.MenuLink
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Una sección del menú: título en mono y sus accesos como filas con flecha. */
@Composable
fun MenuSection(title: String, links: List<MenuLink>) {
    if (links.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Text(title.uppercase(), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
        Column(Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(FtColors.Card)) {
            links.forEachIndexed { i, link ->
                if (i > 0) HorizontalDivider(color = FtColors.Border)
                MenuRow(link)
            }
        }
    }
}

@Composable
private fun MenuRow(link: MenuLink) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = Spacing.minTouchTarget + Spacing.sm)
            .clickable(role = Role.Button, onClick = link.onClick)
            .padding(horizontal = Spacing.lg, vertical = Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(link.label, style = MaterialTheme.typography.bodyLarge, color = FtColors.TextPrimary, modifier = Modifier.weight(1f))
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = FtColors.TextSecondary)
    }
}
