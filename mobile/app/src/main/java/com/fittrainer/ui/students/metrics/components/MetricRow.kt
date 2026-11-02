package com.fittrainer.ui.students.metrics.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.data.students.metrics.StudentMetric
import com.fittrainer.ui.students.detail.dateLabel
import com.fittrainer.ui.students.metrics.circumferencesLine
import com.fittrainer.ui.students.metrics.metricLine
import com.fittrainer.ui.students.metrics.recordedByLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Fecha, "80,5 kg · IMC 24,1 · 18 %", las circunferencias y quién la cargó; papelera de 44 dp. */
@Composable
fun MetricRow(metric: StudentMetric, canDelete: Boolean, onDelete: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(
                "${dateLabel(metric.recordedAt)} · ${recordedByLabel(metric.recordedBy)}",
                style = MaterialTheme.typography.labelSmall,
                color = FtColors.TextSecondary,
            )
            Text(metricLine(metric), style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
            circumferencesLine(metric).takeIf { it.isNotEmpty() }?.let {
                Text("$it cm", style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
            }
        }
        IconButton(onClick = onDelete, enabled = canDelete, modifier = Modifier.size(Spacing.minTouchTarget)) {
            Icon(Icons.Filled.Delete, contentDescription = "Borrar medida", tint = if (canDelete) FtColors.Coral else FtColors.Ink5)
        }
    }
}
