package com.fittrainer.ui.progress.charts.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * Fila de chips deslizable para métrica, campo o período. Es elección única: para TalkBack, un grupo de radios. El rol
 * va en el modificador de afuera, que le gana al Checkbox que pone FilterChip adentro.
 */
@Composable
fun <T> ChartChips(items: List<T>, selected: T?, label: (T) -> String, onSelect: (T) -> Unit) {
    LazyRow(Modifier.selectableGroup(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        items(items, key = { label(it) }) { item ->
            FilterChip(
                selected = item == selected,
                onClick = { onSelect(item) },
                label = { Text(label(item)) },
                modifier = Modifier.semantics { role = Role.RadioButton }.heightIn(min = Spacing.minTouchTarget),
                colors = FilterChipDefaults.filterChipColors(
                    containerColor = FtColors.Card,
                    labelColor = FtColors.TextSecondary,
                    selectedContainerColor = FtColors.Brand,
                    selectedLabelColor = FtColors.TextPrimary,
                ),
            )
        }
    }
}
