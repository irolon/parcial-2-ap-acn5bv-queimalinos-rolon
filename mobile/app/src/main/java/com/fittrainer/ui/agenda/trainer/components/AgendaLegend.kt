package com.fittrainer.ui.agenda.trainer.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.ui.agenda.trainer.statusLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** La leyenda de colores de los estados, al pie (Legend de la web). */
@Composable
fun AgendaLegend() {
    Row(horizontalArrangement = Arrangement.spacedBy(Spacing.lg)) {
        AppointmentStatus.entries.forEach { status ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(Modifier.size(8.dp).background(statusColor(status), CircleShape))
                Text(statusLabel(status), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            }
        }
    }
}
