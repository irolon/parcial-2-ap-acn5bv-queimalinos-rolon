package com.fittrainer.ui.progress.charts.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Fila de chips deslizable para métrica, campo o período. */
@Composable
fun <T> ChartChips(items: List<T>, selected: T?, label: (T) -> String, onSelect: (T) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        items(items, key = { label(it) }) { item ->
            FilterChip(
                selected = item == selected,
                onClick = { onSelect(item) },
                label = { Text(label(item)) },
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
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
