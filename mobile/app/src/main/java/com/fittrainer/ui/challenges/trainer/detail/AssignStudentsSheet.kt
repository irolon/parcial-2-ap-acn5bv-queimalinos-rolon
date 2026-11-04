package com.fittrainer.ui.challenges.trainer.detail

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.TrainerStudent
import com.fittrainer.ui.challenges.trainer.MAX_BATCH
import com.fittrainer.ui.challenges.trainer.NO_ACTIVE_STUDENTS
import com.fittrainer.ui.challenges.trainer.PICK_STUDENTS
import com.fittrainer.ui.challenges.trainer.STUDENTS_FAILED
import com.fittrainer.ui.challenges.trainer.STUDENTS_LOADING
import com.fittrainer.ui.challenges.trainer.TOO_MANY
import com.fittrainer.ui.challenges.trainer.assignButton
import com.fittrainer.ui.routines.trainer.components.CheckRow
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.templates.trainer.assign.filterStudents
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Con más de esta cantidad de alumnos aparece la búsqueda. */
private const val SEARCH_FROM = 8

/** Elegir a qué alumnos activos asignar el desafío, con casillas. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssignStudentsSheet(
    students: List<TrainerStudent>,
    load: StudentsLoad,
    pick: PickState,
    offline: Boolean,
    onToggle: (String) -> Unit,
    onRetryStudents: () -> Unit,
    onSubmit: () -> Unit,
    onDismiss: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        LazyColumn(
            Modifier.fillMaxWidth().padding(horizontal = Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs),
        ) {
            item { Text(PICK_STUDENTS, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary) }
            if (students.size > SEARCH_FROM) {
                item {
                    OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), label = { Text("Buscar") }, singleLine = true)
                }
            }
            if (students.isEmpty()) {
                item {
                    when (load) {
                        StudentsLoad.READY -> Text(NO_ACTIVE_STUDENTS, color = FtColors.TextSecondary)
                        StudentsLoad.LOADING -> Text(STUDENTS_LOADING, color = FtColors.TextSecondary)
                        StudentsLoad.FAILED -> RetryRow(STUDENTS_FAILED, onRetryStudents)
                    }
                }
            }
            items(filterStudents(students, query), key = { it.id }) { student ->
                CheckRow(student.name, student.id in pick.selected, enabled = !pick.submitting) { onToggle(student.id) }
            }
            item {
                val tooMany = pick.selected.size > MAX_BATCH
                (pick.error ?: TOO_MANY.takeIf { tooMany })?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.Coral)
                }
                Button(
                    onClick = onSubmit,
                    enabled = !offline && !pick.submitting && pick.selected.isNotEmpty() && !tooMany,
                    modifier = Modifier.fillMaxWidth().padding(top = Spacing.sm, bottom = Spacing.lg).height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                ) { Text(assignButton(pick.selected.size)) }
            }
        }
    }
}
