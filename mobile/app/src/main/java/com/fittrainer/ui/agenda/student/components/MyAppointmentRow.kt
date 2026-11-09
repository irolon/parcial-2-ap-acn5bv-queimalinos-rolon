package com.fittrainer.ui.agenda.student.components

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
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.ui.agenda.dayHourLabel
import com.fittrainer.ui.agenda.statusColor
import com.fittrainer.ui.agenda.statusLabel
import com.fittrainer.ui.agenda.statusTextColor
import com.fittrainer.ui.agenda.student.mine.MyAppointmentActions
import com.fittrainer.ui.agenda.student.mine.MyAppointmentItem
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Opacidad de un turno cancelado: queda a la vista, pero detrás de los que siguen en pie. */
private const val CANCELLED_ALPHA = 0.55f

/**
 * Un turno propio: día y hora, estado con el color de la agenda (E13) y la nota. Solo los que se pueden cancelar son
 * un toque (mínimo 44); TalkBack lee la fila entera.
 */
@Composable
fun MyAppointmentRow(item: MyAppointmentItem, onClick: () -> Unit) {
    val appt = item.appointment
    val cancelled = appt.status == AppointmentStatus.CANCELLED
    val color = statusColor(appt.status)
    val tap = if (item.actions == MyAppointmentActions.CANCEL) Modifier.clickable(onClick = onClick) else Modifier
    Row(
        Modifier.fillMaxWidth().height(IntrinsicSize.Min).heightIn(min = Spacing.minTouchTarget)
            .clip(MaterialTheme.shapes.medium).background(FtColors.Card).then(tap).alpha(if (cancelled) CANCELLED_ALPHA else 1f),
    ) {
        Box(Modifier.width(3.dp).fillMaxHeight().background(color))
        Column(Modifier.padding(Spacing.md), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                dayHourLabel(appt.at),
                style = MaterialTheme.typography.bodyLarge,
                color = FtColors.TextPrimary,
                textDecoration = if (cancelled) TextDecoration.LineThrough else null,
            )
            Text(statusLabel(appt.status), style = MaterialTheme.typography.labelSmall, color = statusTextColor(appt.status))
            appt.notes?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}
