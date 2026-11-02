package com.fittrainer.ui.progress.charts.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.sp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.JetBrainsMono
import com.fittrainer.ui.theme.Spacing

/** Los dos números debajo del gráfico (spec §3.2 y §3.3). */
@Composable
fun ChartStats(
    firstLabel: String,
    firstValue: String,
    firstDetail: String?,
    deltaText: String?,
    deltaColor: Color,
    deltaDetail: String?,
) {
    // IntrinsicSize.Min + fillMaxHeight: las dos tarjetas toman el alto de la más alta.
    Row(
        Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        StatCard(firstLabel, firstValue, FtColors.TextPrimary, firstDetail)
        StatCard("En el período", deltaText ?: "—", deltaColor, deltaDetail)
    }
}

@Composable
private fun RowScope.StatCard(label: String, value: String, valueColor: Color, detail: String?) {
    Column(
        Modifier.weight(1f).fillMaxHeight()
            .background(FtColors.Card, MaterialTheme.shapes.medium).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        Text(
            value,
            style = MaterialTheme.typography.titleMedium.copy(fontFamily = JetBrainsMono, fontSize = 20.sp),
            color = valueColor,
        )
        if (detail != null) Text(detail, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    }
}
