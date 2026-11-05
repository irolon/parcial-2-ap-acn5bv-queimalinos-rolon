package com.fittrainer.ui.agenda.student.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.fittrainer.ui.agenda.dayHourLabel
import com.fittrainer.ui.agenda.dayMonthLabel
import com.fittrainer.ui.agenda.hourLabel
import com.fittrainer.ui.agenda.student.request.SlotDay
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant

/** Un día con horarios libres: "VIE 06/11" y un chip por hora (mínimo 44). Tocar uno abre la hoja para pedirlo. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SlotDayCard(day: SlotDay, onSelect: (Instant) -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(
            dayMonthLabel(day.date),
            Modifier.semantics { heading() },
            style = MaterialTheme.typography.labelMedium,
            color = FtColors.TextSecondary,
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            day.slots.forEach { at ->
                OutlinedButton(
                    onClick = { onSelect(at) },
                    // TalkBack lee el día y la hora, no solo "18:00".
                    modifier = Modifier.heightIn(min = Spacing.minTouchTarget).semantics { contentDescription = dayHourLabel(at) },
                ) { Text(hourLabel(at), color = FtColors.TextPrimary) }
            }
        }
    }
}
