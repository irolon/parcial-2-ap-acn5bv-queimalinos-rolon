package com.fittrainer.ui.students.progress

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.progress.DayMark
import com.fittrainer.data.students.progress.DayStatus
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.YearMonth

private fun cellColor(status: DayStatus?): Color = when (status) {
    DayStatus.TRAINED -> FtColors.Brand
    DayStatus.MISSED -> FtColors.Coral.copy(alpha = 0.8f)
    else -> FtColors.Elevated
}

/** Grilla de 7 columnas que empieza el lunes: azul = entrenó, coral = faltó, sin color = sin plan; lo que viene, atenuado. */
@Composable
fun AttendanceCalendar(month: YearMonth, marks: List<DayMark>) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            WEEKDAY_INITIALS.forEach { d ->
                Text(d, Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            }
        }
        calendarCells(month, marks).chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                week.forEach { cell ->
                    Box(Modifier.weight(1f).aspectRatio(1f), contentAlignment = Alignment.Center) {
                        if (cell != null) {
                            Box(
                                Modifier.fillMaxWidth().aspectRatio(1f)
                                    .alpha(if (cell.status == DayStatus.UPCOMING) 0.4f else 1f)
                                    .background(cellColor(cell.status), MaterialTheme.shapes.small),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("${cell.day}", style = MaterialTheme.typography.labelSmall, color = FtColors.TextPrimary)
                            }
                        }
                    }
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md), verticalAlignment = Alignment.CenterVertically) {
            Legend(FtColors.Brand, LEGEND_TRAINED)
            Legend(FtColors.Coral, LEGEND_MISSED)
            Legend(FtColors.Elevated, LEGEND_REST)
        }
    }
}

@Composable
private fun Legend(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Box(Modifier.size(10.dp).background(color, CircleShape))
        Text(label, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    }
}
