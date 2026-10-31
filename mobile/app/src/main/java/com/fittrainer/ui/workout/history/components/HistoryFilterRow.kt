package com.fittrainer.ui.workout.history.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.HistoryFilter
import com.fittrainer.ui.workout.history.unreadBadgeText

/** Chips deslizables. "Sin subir" solo aparece si hay algo sin subir; "Comentados" lleva el badge de sin leer. */
@Composable
fun HistoryFilterRow(
    selected: HistoryFilter,
    showPending: Boolean,
    unreadComments: Int = 0,
    onSelect: (HistoryFilter) -> Unit,
) {
    val filters = HistoryFilter.entries.filter { it != HistoryFilter.PENDING || showPending }
    // El padding de arriba y del final deja lugar al badge, que sobresale de la esquina y el LazyRow lo recortaría.
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        contentPadding = PaddingValues(top = Spacing.sm, end = Spacing.sm),
    ) {
        items(filters, key = { it.name }) { filter ->
            val unread = if (filter == HistoryFilter.COMMENTED) unreadComments else 0
            BadgedBox(badge = {
                if (unread > 0) Badge(Modifier.offset(x = 4.dp, y = (-4).dp)) { Text(unreadBadgeText(unread)) }
            }) {
            FilterChip(
                selected = filter == selected,
                onClick = { onSelect(filter) },
                label = { Text(filter.label) },
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget).then(
                    if (unread > 0) Modifier.semantics { contentDescription = "Comentados, $unread sin leer" } else Modifier,
                ),
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
}
