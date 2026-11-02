package com.fittrainer.ui.routines.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.ExerciseDetailSheet
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.components.exercise.SectionLabel
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.routines.detail.components.StartBar
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.dayName
import com.fittrainer.ui.today.toDetail
import com.fittrainer.ui.workout.WorkoutEntryViewModel

/** Mis rutinas → una rutina: sus ejercicios y "Empezar" aunque hoy no le toque. */
@Composable
fun RoutineDetailScreen(
    onBack: () -> Unit,
    onOpenWorkout: () -> Unit,
    viewModel: RoutineDetailViewModel = hiltViewModel(),
    entry: WorkoutEntryViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val entryError by entry.error.collectAsStateWithLifecycle()
    var selected by remember { mutableStateOf<RoutineExercise?>(null) }
    val loaded = state.content as? RoutineDetailContent.Loaded
    Column(Modifier.fillMaxSize().background(FtColors.Background)) {
        LazyColumn(
            Modifier.weight(1f),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                    }
                    // Mientras carga (o si ya no está) la barra no queda vacía.
                    Text(loaded?.routine?.name ?: "Rutina", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
                }
            }
            if (state.isOffline) item { OfflineIndicator("Sin conexión · mostrando lo guardado") }
            entryError?.let { item { NoticeBanner(it, entry::dismissError) } }
            when (val content = state.content) {
                is RoutineDetailContent.Loaded -> {
                    val routine = content.routine
                    val summary = listOfNotNull(
                        routine.goal?.let(::goalLabel),
                        routine.days.sorted().joinToString(", ") { dayName(it) }.takeIf { it.isNotEmpty() },
                    ).joinToString(" · ")
                    if (summary.isNotEmpty()) item { Text(summary, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
                    item { SectionLabel("EJERCICIOS", routine.exercises.size.toString()) }
                    items(routine.exercises, key = { it.id }) { exercise ->
                        ExerciseRow(exercise.name, detailSubtitle(exercise), onClick = { selected = exercise })
                    }
                }
                RoutineDetailContent.Missing -> {
                    item { InfoCard("Esta rutina ya no está disponible", "Puede que tu entrenador la haya desactivado.") }
                    item { TextButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Volver") } }
                }
                null -> Unit
            }
        }
        loaded?.let { StartBar(it.action, onStart = { entry.start(it.routine, onOpenWorkout) }, onOpenWorkout = onOpenWorkout) }
    }
    selected?.let { exercise ->
        ExerciseDetailSheet(exercise.toDetail(), canOpenVideo = !state.isOffline, onDismiss = { selected = null })
    }
}
