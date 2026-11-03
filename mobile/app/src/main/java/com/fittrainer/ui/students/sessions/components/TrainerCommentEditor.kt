package com.fittrainer.ui.students.sessions.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.detail.components.SectionCard
import com.fittrainer.ui.students.sessions.COMMENT_HINT
import com.fittrainer.ui.students.sessions.COMMENT_NEEDS_NETWORK
import com.fittrainer.ui.students.sessions.COMMENT_TITLE
import com.fittrainer.ui.students.sessions.commentCounter
import com.fittrainer.ui.students.sessions.detail.StudentSessionDetailUiState
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Comentario del entrenador: el alumno lo ve en su historial. Hasta 1000 caracteres; solo online. */
@Composable
fun TrainerCommentEditor(
    state: StudentSessionDetailUiState,
    onDraft: (String) -> Unit,
    onSave: () -> Unit,
    onDelete: () -> Unit,
) = SectionCard(COMMENT_TITLE) {
    if (state.offline) OfflineIndicator(COMMENT_NEEDS_NETWORK)
    OutlinedTextField(
        value = state.draft,
        onValueChange = onDraft,
        modifier = Modifier.fillMaxWidth(),
        // Mientras se envía no se edita: lo que se ve es lo que se está guardando.
        enabled = !state.saving && !state.gone,
        placeholder = { Text(COMMENT_HINT) },
        minLines = 3,
        isError = state.tooLong,
        supportingText = {
            Text(commentCounter(state.draft), color = if (state.tooLong) FtColors.Coral else FtColors.TextSecondary)
        },
    )
    Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Button(onClick = onSave, enabled = state.canSave, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
            Text(if (state.saving) "Guardando…" else "Guardar")
        }
        if (state.canDelete || state.detail?.trainerComment != null) {
            TextButton(onClick = onDelete, enabled = state.canDelete, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Text("Borrar", color = if (state.canDelete) FtColors.Coral else FtColors.TextSecondary)
            }
        }
    }
}
