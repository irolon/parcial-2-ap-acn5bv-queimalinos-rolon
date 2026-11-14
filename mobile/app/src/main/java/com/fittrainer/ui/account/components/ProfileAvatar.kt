package com.fittrainer.ui.account.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.theme.FtColors

/**
 * Foto de perfil con las iniciales debajo: si no hay URL, todavía carga o la URL firmada venció (dura una hora),
 * se ven las iniciales. Es decorativa: el nombre está escrito al lado.
 */
@Composable
fun ProfileAvatar(name: String, url: String?, size: Dp = 72.dp) {
    Box(
        Modifier.size(size).clip(CircleShape).background(FtColors.Elevated).clearAndSetSemantics {},
        contentAlignment = Alignment.Center,
    ) {
        Text(initials(name), style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
        if (url != null) {
            AsyncImage(model = url, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        }
    }
}
