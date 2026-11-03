package com.fittrainer.ui.exercises.trainer.components

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
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Una opción entre [options] (o ninguna): tocar la elegida manda null. Lo elegido en azul de marca. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ChoiceChips(
    options: List<String>,
    selected: String?,
    label: (String) -> String,
    enabled: Boolean,
    onSelect: (String?) -> Unit,
) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        options.forEach { option ->
            val on = option == selected
            FilterChip(
                selected = on,
                onClick = { onSelect(if (on) null else option) },
                enabled = enabled,
                label = { Text(label(option)) },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = FtColors.Brand, selectedLabelColor = Color.White),
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
            )
        }
    }
}
