package com.fittrainer.ui.agenda.trainer.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.ui.agenda.trainer.hourLabel
import com.fittrainer.ui.agenda.trainer.statusLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Los colores de la web: pendiente en aviso (warn), confirmado en verde (good), cancelado en gris. */
fun statusColor(status: AppointmentStatus): Color = when (status) {
    AppointmentStatus.PENDING -> FtColors.Amber
    AppointmentStatus.CONFIRMED -> FtColors.Green
    AppointmentStatus.CANCELLED -> FtColors.Ink5
}

/** El texto del estado; el cancelado va en gris claro para que se lea sobre la tarjeta. */
fun statusTextColor(status: AppointmentStatus): Color =
    if (status == AppointmentStatus.CANCELLED) FtColors.TextSecondary else statusColor(status)

/** Un turno del día: hora, nombre y estado en mono. Toda la fila es el toque (mínimo 44); TalkBack la lee entera. */
@Composable
fun AppointmentRow(appointment: Appointment, onClick: () -> Unit) {
    val color = statusColor(appointment.status)
    val cancelled = appointment.status == AppointmentStatus.CANCELLED
    Row(
        Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clip(MaterialTheme.shapes.small).clickable(onClick = onClick),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Text(hourLabel(appointment.at), Modifier.width(48.dp), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
        Row(
            Modifier.weight(1f).height(IntrinsicSize.Min).heightIn(min = Spacing.minTouchTarget).clip(MaterialTheme.shapes.small)
                .background(color.copy(alpha = 0.16f)),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.width(3.dp).fillMaxHeight().background(color))
            Column(Modifier.padding(horizontal = Spacing.sm, vertical = Spacing.xs), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    appointment.studentName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = FtColors.TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textDecoration = if (cancelled) TextDecoration.LineThrough else null,
                )
                Text(statusLabel(appointment.status), style = MaterialTheme.typography.labelSmall, color = statusTextColor(appointment.status))
            }
        }
    }
}
