package com.fittrainer.ui.today.components

import androidx.compose.runtime.Composable
import com.fittrainer.ui.components.InfoCard
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
