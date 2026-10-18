package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.library.availableGroups
import com.fittrainer.ui.library.components.MuscleChips
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.LIBRARY_NEVER_SYNCED

/** Biblioteca de Room filtrada por el grupo del ejercicio; los chips cambian de grupo (spec §3). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReplaceSheet(
    library: LibraryCache,
    currentGroup: String?,
    currentExerciseId: String,
    onDismiss: () -> Unit,
    onPick: (LibraryExercise) -> Unit,
) {
    var group by remember { mutableStateOf(currentGroup) }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Text("Reemplazar ejercicio", style = MaterialTheme.typography.titleLarge)
            if (library.lastSyncedAt == null) {
                InfoCard("Todavía no hay biblioteca", LIBRARY_NEVER_SYNCED)
                return@Column
            }
            MuscleChips(availableGroups(library.exercises), group) { group = it }
            val shown = library.exercises.filter { (group == null || it.muscleGroup == group) && it.id != currentExerciseId }
            LazyColumn(contentPadding = PaddingValues(bottom = Spacing.xl), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                items(shown, key = { it.id }) { e ->
                    ExerciseRow(e.name, muscleLabel(e.muscleGroup), onClick = { onPick(e) })
                }
            }
        }
    }
}
