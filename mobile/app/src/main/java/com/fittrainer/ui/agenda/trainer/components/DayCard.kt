package com.fittrainer.ui.agenda.trainer.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.fittrainer.data.agenda.Appointment
import com.fittrainer.ui.agenda.dayLabel
import com.fittrainer.ui.agenda.trainer.AgendaDay
import com.fittrainer.ui.agenda.trainer.NO_APPOINTMENTS
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * Un día de la semana: la etiqueta (en acento si es hoy), la disponibilidad y los turnos por hora. La web la
 * sombrea en la grilla; en la lista no hay celdas, así que va como texto en el encabezado.
 */
@Composable
fun DayCard(day: AgendaDay, onSelect: (Appointment) -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(
                dayLabel(day.date),
                Modifier.weight(1f).semantics { heading() },
                style = MaterialTheme.typography.labelMedium,
                color = if (day.isToday) FtColors.BrandText else FtColors.TextSecondary,
            )
            day.availability?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary) }
        }
        if (day.appointments.isEmpty()) {
            Text(NO_APPOINTMENTS, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        } else {
            day.appointments.forEach { appt -> AppointmentRow(appt) { onSelect(appt) } }
        }
    }
}
