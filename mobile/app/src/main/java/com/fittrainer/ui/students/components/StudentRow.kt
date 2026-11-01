package com.fittrainer.ui.students.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.StudentStatus
import com.fittrainer.ui.students.NO_PLAN
import com.fittrainer.ui.students.StudentRowUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Verde ≥ 70 %, azul ≥ 50 %, coral por debajo. */
fun adherenceColor(pct: Int): Color = when {
    pct >= 70 -> FtColors.Green
    pct >= 50 -> FtColors.Brand
    else -> FtColors.Coral
}

private fun statusColor(status: StudentStatus): Color = when (status) {
    StudentStatus.ACTIVE -> FtColors.Green
    StudentStatus.INACTIVE -> FtColors.Coral
    StudentStatus.NEW -> FtColors.Cyan
    StudentStatus.DISABLED -> FtColors.TextSecondary
}

@Composable
fun StudentRow(row: StudentRowUi, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)
            .background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        StudentAvatar(row.initials, atRisk = row.status == StudentStatus.INACTIVE)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(row.name, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(row.subtitle, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            AdherenceBar(row.adherencePct)
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            StatusPill(row.statusLabel, statusColor(row.status))
            Text(row.lastTraining, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        }
    }
}

@Composable
private fun AdherenceBar(pct: Int?) {
    if (pct == null) {
        Text(NO_PLAN, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        return
    }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Box(Modifier.width(96.dp).height(4.dp).background(FtColors.Elevated, MaterialTheme.shapes.small)) {
            Box(
                Modifier.fillMaxWidth(pct.coerceIn(0, 100) / 100f).height(4.dp)
                    .background(adherenceColor(pct), MaterialTheme.shapes.small),
            )
        }
        Text("$pct%", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    }
}

@Composable
private fun StatusPill(text: String, color: Color) {
    Text(
        text,
        modifier = Modifier.background(color.copy(alpha = 0.16f), MaterialTheme.shapes.small)
            .padding(horizontal = Spacing.sm, vertical = 2.dp),
        style = MaterialTheme.typography.labelSmall,
        color = color,
    )
}
