package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.dayShort
import com.fittrainer.ui.today.dayName
import com.fittrainer.ui.today.week.WeekStats
import java.time.DayOfWeek
import java.time.LocalDate

/** Lunes a domingo de la semana: días con entreno, hoy con borde, ✓ en los hechos y un día elegido que se toca. */
@Composable
fun WeekStrip(
    week: List<LocalDate>,
    trainingDays: Set<DayOfWeek>,
    today: LocalDate,
    done: Set<LocalDate>,
    selected: LocalDate,
    onSelect: (LocalDate) -> Unit,
    stats: WeekStats? = null,
) {
    val label = if (stats != null && stats.assignedDays > 0) {
        "SEMANA · ${stats.doneDays} DE ${stats.assignedDays} HECHAS"
    } else "SEMANA"
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).padding(horizontal = Spacing.sm, vertical = Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(
            label, Modifier.padding(horizontal = Spacing.sm),
            style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary,
        )
        Row(Modifier.fillMaxWidth()) {
            week.forEach { date ->
                DayChip(
                    Modifier.weight(1f),
                    date,
                    training = date.dayOfWeek in trainingDays,
                    isToday = date == today,
                    isDone = date in done,
                    isSelected = date == selected,
                    onClick = { onSelect(date) },
                )
            }
        }
    }
}

@Composable
private fun DayChip(
    modifier: Modifier,
    date: LocalDate,
    training: Boolean,
    isToday: Boolean,
    isDone: Boolean,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    val shape = MaterialTheme.shapes.small
    val day = date.dayOfWeek
    val background = when {
        isSelected -> FtColors.Brand
        isDone -> FtColors.Green.copy(alpha = 0.18f)
        training -> FtColors.Elevated
        else -> Color.Transparent
    }
    val description = buildString {
        append(dayName(day))
        append(if (training) ", entrenás" else ", descanso")
        if (isToday) append(", hoy")
        if (isDone) append(", entrenado")
        if (isSelected) append(", elegido")
    }
    // Cada día ocupa 1/7 del ancho (con zoom de pantalla también entran los 7) y 44 dp de alto; el chip visual es de
    // hasta 32 dp de ancho, centrado.
    Box(
        modifier
            .height(Spacing.minTouchTarget)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Column(
            Modifier.widthIn(max = 32.dp).fillMaxWidth().fillMaxHeight().background(background, shape)
                .then(if (isToday) Modifier.border(1.dp, FtColors.BrandText, shape) else Modifier),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                dayShort(day),
                style = MaterialTheme.typography.labelMedium,
                color = if (training || isSelected) FtColors.TextPrimary else FtColors.Ink5,
            )
            if (isDone) {
                Text("✓", style = MaterialTheme.typography.labelSmall, color = if (isSelected) FtColors.TextPrimary else FtColors.Green)
            }
        }
    }
}
