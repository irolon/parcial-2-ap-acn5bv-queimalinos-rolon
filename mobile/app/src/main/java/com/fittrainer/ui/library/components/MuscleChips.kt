package com.fittrainer.ui.library.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.library.ALL_GROUPS
import com.fittrainer.ui.theme.Spacing

/** "Todos" + un chip por grupo con ejercicios. selected == null: "Todos". */
@Composable
fun MuscleChips(groups: List<String>, selected: String?, onSelect: (String?) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        item {
            FilterChip(
                selected = selected == null,
                onClick = { onSelect(null) },
                label = { Text(ALL_GROUPS) },
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
            )
        }
        items(groups, key = { it }) { group ->
            FilterChip(
                selected = selected == group,
                onClick = { onSelect(group) },
                label = { Text(muscleLabel(group)) },
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
            )
        }
    }
}
