package com.fittrainer.ui.workout.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrainer.data.workout.Load
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.kgNumber

private val STEPS = listOf(-2.5, -1.0, 1.0, 2.5, 5.0)

/** Chip del plan del PT, peso y reps en 72 sp, y los ajustes rápidos (spec §3, mockup p.13). */
@Composable
fun LoadPanel(chip: String?, load: Load, onAdjust: (Double) -> Unit, onEdit: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        chip?.let {
            Box(Modifier.clip(MaterialTheme.shapes.extraLarge).background(FtColors.Card).padding(horizontal = Spacing.md, vertical = Spacing.xs)) {
                Text("✦ $it", style = MaterialTheme.typography.labelSmall, color = FtColors.BrandText)
            }
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            BigNumber("PESO", kgNumber(load.kg), "KG", Modifier.weight(1f))
            Box(Modifier.width(1.dp).height(72.dp).background(FtColors.Border))
            BigNumber("REPS", load.reps.toString(), "×", Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            STEPS.forEach { step ->
                FilledTonalButton(
                    onClick = { onAdjust(step) },
                    modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget),
                    contentPadding = PaddingValues(0.dp),
                ) { Text(stepLabel(step), style = MaterialTheme.typography.labelLarge) }
            }
            FilledTonalButton(
                onClick = onEdit,
                modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget),
                contentPadding = PaddingValues(0.dp),
            ) { Icon(Icons.Filled.Edit, contentDescription = "Escribir peso y reps") }
        }
    }
}

@Composable
private fun BigNumber(label: String, value: String, unit: String, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, style = MaterialTheme.typography.displayLarge.copy(fontSize = 72.sp, lineHeight = 76.sp), color = FtColors.TextPrimary)
            Text(unit, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary, modifier = Modifier.padding(bottom = Spacing.md))
        }
    }
}

private fun stepLabel(step: Double): String {
    val sign = if (step > 0) "+" else "−"
    return sign + kgNumber(kotlin.math.abs(step))
}
