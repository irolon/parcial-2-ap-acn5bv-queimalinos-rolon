package com.fittrainer.ui.agenda.trainer.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fittrainer.ui.agenda.trainer.AGENDA_TITLE
import com.fittrainer.ui.agenda.trainer.AGENDA_TODAY
import com.fittrainer.ui.agenda.trainer.SHOW_CANCELLED
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Volver, "Agenda" y la semana que se está mirando. */
@Composable
fun AgendaHeader(subtitle: String, onBack: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
        }
        Column {
            Text(AGENDA_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            Text(subtitle, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        }
    }
}

/** Callbacks de la barra de semana. */
class WeekBarActions(
    val onPrev: () -> Unit,
    val onToday: () -> Unit,
    val onNext: () -> Unit,
    val onToggleCancelled: (Boolean) -> Unit,
)

/** ‹ Hoy › y abajo el switch "Mostrar cancelados" (apagado por defecto, como la web): en una fila no entran a 360 dp. */
@Composable
fun WeekBar(showCancelled: Boolean, actions: WeekBarActions) {
    Column {
        WeekNav(actions)
        CancelledToggle(showCancelled, actions.onToggleCancelled)
    }
}

@Composable
private fun WeekNav(actions: WeekBarActions) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        IconButton(onClick = actions.onPrev, modifier = Modifier.sizeIn(minWidth = Spacing.minTouchTarget, minHeight = Spacing.minTouchTarget)) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Semana anterior", tint = FtColors.TextPrimary)
        }
        OutlinedButton(onClick = actions.onToday, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text(AGENDA_TODAY) }
        IconButton(onClick = actions.onNext, modifier = Modifier.sizeIn(minWidth = Spacing.minTouchTarget, minHeight = Spacing.minTouchTarget)) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Semana siguiente", tint = FtColors.TextPrimary)
        }
    }
}

/** Toda la fila es el toque, no solo el switch. */
@Composable
private fun CancelledToggle(showCancelled: Boolean, onToggle: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)
            .toggleable(value = showCancelled, onValueChange = onToggle, role = Role.Switch),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(SHOW_CANCELLED, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        Switch(checked = showCancelled, onCheckedChange = null, colors = SwitchDefaults.colors(checkedTrackColor = FtColors.Brand))
    }
}
