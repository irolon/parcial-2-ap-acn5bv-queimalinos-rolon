package com.fittrainer.ui.students.overview.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.overview.TrainerOverview
import com.fittrainer.ui.students.overview.HomeFilter
import com.fittrainer.ui.students.overview.filterCaption
import com.fittrainer.ui.students.overview.filterCount
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Grilla 2 × 2 de filtros grandes (número y una línea de contexto); el elegido va con borde azul. RIESGO en coral si hay alguno. */
@Composable
fun FilterGrid(o: TrainerOverview, selected: HomeFilter, onSelect: (HomeFilter) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        HomeFilter.entries.chunked(2).forEach { pair ->
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                pair.forEach { f ->
                    val count = filterCount(o, f)
                    FilterCard(f.label, count, filterCaption(o, f), f == selected, f == HomeFilter.RISK && count > 0, Modifier.weight(1f)) { onSelect(f) }
                }
            }
        }
    }
}

@Composable
private fun FilterCard(label: String, count: Int, caption: String, selected: Boolean, alert: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val shape = MaterialTheme.shapes.large
    val accent = if (alert) FtColors.Coral else FtColors.TextPrimary
    Column(
        modifier.heightIn(min = 120.dp).clip(shape)
            .background(if (selected) FtColors.Brand.copy(alpha = 0.16f) else FtColors.Card, shape)
            .border(1.5.dp, if (selected) FtColors.Brand else FtColors.Card, shape)
            .semantics { this.selected = selected }
            .clickable(role = Role.Tab, onClick = onClick)
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = if (alert) FtColors.Coral else FtColors.TextSecondary)
        Text("$count", style = MaterialTheme.typography.displaySmall, color = accent)
        Text(caption, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}
