package com.fittrainer.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.fittrainer.data.routines.trainer.WEEK_DAYS
import com.fittrainer.ui.routines.trainer.dayChip
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Chips de los días de la semana (en orden), lo elegido en azul de marca. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DayChips(selected: Set<String>, enabled: Boolean, onToggle: (String) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        WEEK_DAYS.forEach { day ->
            FilterChip(
                selected = day in selected,
                onClick = { onToggle(day) },
                enabled = enabled,
                label = { Text(dayChip(day)) },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = FtColors.Brand, selectedLabelColor = Color.White),
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
            )
        }
    }
}
