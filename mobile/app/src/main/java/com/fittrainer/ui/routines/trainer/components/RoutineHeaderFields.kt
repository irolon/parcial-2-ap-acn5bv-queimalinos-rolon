package com.fittrainer.ui.routines.trainer.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.fittrainer.data.invitation.invite.GOALS
import com.fittrainer.data.routines.trainer.RoutineField
import com.fittrainer.data.routines.trainer.RoutineHeaderInput
import com.fittrainer.data.routines.trainer.WEEK_DAYS
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.routines.trainer.dayChip
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Nombre, objetivo (4 opciones) y días (chips). Los usan la hoja "Editar" y el paso 1 del asistente. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RoutineHeaderFields(
    input: RoutineHeaderInput,
    errors: Map<RoutineField, String>,
    enabled: Boolean,
    onChange: ((RoutineHeaderInput) -> RoutineHeaderInput) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        OutlinedTextField(
            value = input.name,
            onValueChange = { v -> onChange { it.copy(name = v) } },
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            label = { Text("Nombre") },
            isError = errors[RoutineField.NAME] != null,
            supportingText = errors[RoutineField.NAME]?.let { { Text(it) } },
            singleLine = true,
        )
        Label("OBJETIVO", errors[RoutineField.GOAL])
        FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            GOALS.forEach { goal ->
                FilterChip(
                    selected = input.goal == goal,
                    onClick = { onChange { it.copy(goal = goal) } },
                    enabled = enabled,
                    label = { Text(goalLabel(goal)) },
                    colors = chipColors(),
                    modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                )
            }
        }
        Label("DÍAS", errors[RoutineField.DAYS])
        FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            WEEK_DAYS.forEach { day ->
                val on = day in input.days
                FilterChip(
                    selected = on,
                    onClick = { onChange { it.copy(days = if (on) it.days - day else it.days + day) } },
                    enabled = enabled,
                    label = { Text(dayChip(day)) },
                    colors = chipColors(),
                    modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                )
            }
        }
    }
}

@Composable
private fun Label(text: String, error: String?) {
    Text(text, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.Coral) }
}

/** Lo elegido en azul de marca: con el tema oscuro, el gris por defecto casi no se distingue. */
@Composable
private fun chipColors() = FilterChipDefaults.filterChipColors(selectedContainerColor = FtColors.Brand, selectedLabelColor = Color.White)
