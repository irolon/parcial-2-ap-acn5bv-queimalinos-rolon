package com.fittrainer.ui.today.week

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

@Composable
fun PastDay(view: DayView.Past, onOpenSession: (String) -> Unit) {
    val kind = when {
        view.sessions.isNotEmpty() -> PastDayKind.TRAINED
        view.assigned -> PastDayKind.MISSED
        else -> PastDayKind.REST
    }
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        DayLabel(pastDayLabel(view.date, kind))
        view.sessions.forEach { SessionCard(it, onOpenSession) }
        when (kind) {
            PastDayKind.MISSED -> InfoCard("No entrenaste este día", "Era un día de entrenamiento.")
            PastDayKind.REST -> RestDayCards(null) {}
            PastDayKind.TRAINED -> Unit
        }
    }
}

@Composable
private fun SessionCard(item: HistoryItem, onOpen: (String) -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large)
            .clickable(role = Role.Button) { onOpen(item.id) }
            .heightIn(min = Spacing.minTouchTarget).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Text(item.routineName ?: "Entrenamiento", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text(sessionSummary(item), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        if (item.hasPr) Text("🏆 Récord", style = MaterialTheme.typography.labelLarge, color = FtColors.Amber)
    }
}

@Composable
fun FutureDay(view: DayView.Future, onOpenRoutine: (String) -> Unit) {
    val routine = view.routine
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        if (routine == null) {
            DayLabel(futureRestLabel(view.date))
            RestDayCards(view.after, onOpenRoutine)
        } else {
            DayLabel(futureDayLabel(view.date))
            FutureTrainingCard(view.date, routine, onOpenRoutine)
        }
    }
}

@Composable
internal fun DayLabel(text: String) {
    Text(text, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary, modifier = Modifier.padding(top = Spacing.xs))
}
