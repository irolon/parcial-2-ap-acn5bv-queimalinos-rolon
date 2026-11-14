package com.fittrainer.ui.account.edit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.account.CHANGE_PHOTO
import com.fittrainer.ui.account.REMOVE_PHOTO
import com.fittrainer.ui.account.components.ProfileAvatar
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** La foto del alumno con Cambiar foto (galería) y, si tiene, Quitar foto. Se guarda al momento, sin Guardar. */
@Composable
internal fun PhotoRow(state: EditProfileUiState, actions: EditProfileActions) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.lg)) {
        ProfileAvatar(state.form.name, state.avatarUrl)
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            val enabled = !state.photoBusy && !state.saving && !state.offline
            OutlinedButton(onClick = actions.onPickPhoto, enabled = enabled, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Text(if (state.photoBusy) "Subiendo…" else CHANGE_PHOTO)
            }
            if (state.avatarUrl != null) {
                TextButton(onClick = actions.onRemovePhoto, enabled = enabled, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Text(REMOVE_PHOTO, color = FtColors.Coral)
                }
            }
        }
    }
    state.photoError?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.Coral) }
}
