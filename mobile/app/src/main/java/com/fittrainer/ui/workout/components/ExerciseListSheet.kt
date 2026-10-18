package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.runtime.Composable
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.exercise
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.theme.Spacing

/** Tocar el nombre del ejercicio: saltar a cualquiera de la sesión. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseListSheet(workout: Workout, onDismiss: () -> Unit, onPick: (Int) -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        LazyColumn(
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            items(workout.exercises, key = { it.position }) { e ->
                val done = workout.sets.count { it.position == e.position }
                ExerciseRow("${e.position + 1}. ${e.name}", "$done/${workout.exercise(e.position).totalSets} series", onClick = { onPick(e.position) })
            }
        }
    }
}
