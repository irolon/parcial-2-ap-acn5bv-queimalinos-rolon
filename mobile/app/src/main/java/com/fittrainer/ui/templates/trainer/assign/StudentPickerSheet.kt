package com.fittrainer.ui.templates.trainer.assign

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.data.students.TrainerStudent
import com.fittrainer.ui.students.components.StudentAvatar
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.templates.trainer.NO_ACTIVE_STUDENTS
import com.fittrainer.ui.templates.trainer.PICK_STUDENT
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Con más de esta cantidad de alumnos aparece la búsqueda. */
private const val SEARCH_FROM = 8

/** Elegir a quién asignar la plantilla: solo los alumnos activos. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentPickerSheet(students: List<TrainerStudent>, onSelect: (TrainerStudent) -> Unit, onDismiss: () -> Unit) {
    var query by remember { mutableStateOf("") }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        LazyColumn(
            Modifier.fillMaxWidth().padding(horizontal = Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs),
        ) {
            item { Text(PICK_STUDENT, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary) }
            if (students.size > SEARCH_FROM) {
                item {
                    OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), label = { Text("Buscar") }, singleLine = true)
                }
            }
            if (students.isEmpty()) item { Text(NO_ACTIVE_STUDENTS, color = FtColors.TextSecondary) }
            items(filterStudents(students, query), key = { it.id }) { student ->
                Row(
                    Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clickable { onSelect(student) }.padding(vertical = Spacing.xs),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Spacing.md),
                ) {
                    StudentAvatar(initials(student.name), atRisk = false)
                    Text(student.name, style = MaterialTheme.typography.bodyLarge, color = FtColors.TextPrimary)
                }
            }
            item { Text("", Modifier.padding(bottom = Spacing.lg)) }
        }
    }
}

/** Por nombre, sin distinguir mayúsculas. */
fun filterStudents(students: List<TrainerStudent>, query: String): List<TrainerStudent> {
    val q = query.trim().lowercase()
    return if (q.isEmpty()) students else students.filter { q in it.name.lowercase() }
}
