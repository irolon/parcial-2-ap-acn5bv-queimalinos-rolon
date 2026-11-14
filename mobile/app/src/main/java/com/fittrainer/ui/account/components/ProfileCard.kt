package com.fittrainer.ui.account.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import com.fittrainer.data.session.Role
import com.fittrainer.ui.account.AccountUiState
import com.fittrainer.ui.account.EDIT_PROFILE
import com.fittrainer.ui.account.NO_PHONE
import com.fittrainer.ui.account.trainsWith
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** La tarjeta de arriba de Perfil / Más: foto o iniciales, nombre, datos y Editar perfil. */
@Composable
fun ProfileCard(state: AccountUiState, onEdit: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(FtColors.Card).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.lg)) {
            ProfileAvatar(state.name, state.avatarUrl)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text(
                    state.name,
                    style = MaterialTheme.typography.titleLarge,
                    color = FtColors.TextPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                // Pantalla compacta: el título y el email van en una línea, con puntos suspensivos.
                state.professionalTitle?.let {
                    Text(
                        it.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = FtColors.BrandText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Detail(state.email)
                if (state.role == Role.STUDENT && state.everLoaded) Detail(state.phone ?: NO_PHONE)
            }
        }
        state.trainerName?.let { Detail(trainsWith(it)) }
        OutlinedButton(onClick = onEdit, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) {
            Icon(Icons.Filled.Edit, contentDescription = null)
            Text(EDIT_PROFILE, modifier = Modifier.padding(start = Spacing.sm))
        }
    }
}

@Composable
private fun Detail(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodyMedium,
        color = FtColors.TextSecondary,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}
