package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.restMessage
import java.time.DayOfWeek

@Composable
fun RestState(nextDay: DayOfWeek?) = InfoCard("Día de descanso", restMessage(nextDay))

@Composable
fun NoRoutineState() = InfoCard(
    "Sin rutina por ahora",
    "Tu entrenador todavía no te asignó una rutina. Escribile para arrancar.",
)

@Composable
fun NeverSyncedState() = InfoCard("Todavía no hay datos", "Conectate una vez para descargar tu rutina.")

/** Ninguno de estos estados es un error: nada de rojo. */
@Composable
private fun InfoCard(title: String, message: String) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text(message, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
    }
}
