package com.fittrainer.ui.account.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.account.BACK
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Flecha para volver y el título, arriba de Editar perfil y Cambiar contraseña. */
@Composable
fun BackHeader(title: String, onBack: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = BACK, tint = FtColors.TextPrimary)
        }
        Text(title, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
    }
}
