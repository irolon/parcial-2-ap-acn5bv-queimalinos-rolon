package com.fittrainer.ui.students.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.data.students.StudentFilter
import com.fittrainer.ui.students.filterLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

@Composable
fun StudentFilters(selected: StudentFilter, onSelect: (StudentFilter) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        items(StudentFilter.entries) { filter ->
            FilterChip(
                selected = filter == selected,
                onClick = { onSelect(filter) },
                label = { Text(filterLabel(filter)) },
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = FtColors.Brand,
                    selectedLabelColor = FtColors.TextPrimary,
                ),
            )
        }
    }
}
