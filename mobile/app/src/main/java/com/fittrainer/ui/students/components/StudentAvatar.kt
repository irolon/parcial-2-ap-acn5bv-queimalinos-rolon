package com.fittrainer.ui.students.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import com.fittrainer.ui.theme.FtColors

/**
 * Círculo con las iniciales; en riesgo va en coral. Si hay URL, la foto va encima de las iniciales:
 * sin URL, todavía cargando o con la URL firmada vencida, se ven las iniciales.
 * En riesgo con foto, el aro coral marca el estado. Es decorativo: el nombre está escrito al lado.
 */
@Composable
fun StudentAvatar(initials: String, atRisk: Boolean, size: Dp = 44.dp, url: String? = null) {
    val riskBorder = if (atRisk && url != null) Modifier.border(2.dp, FtColors.Coral, CircleShape) else Modifier
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .background(if (atRisk) FtColors.Coral.copy(alpha = 0.18f) else FtColors.Elevated, CircleShape)
            .then(riskBorder)
            .clearAndSetSemantics {},
        contentAlignment = Alignment.Center,
    ) {
        Text(
            initials,
            style = MaterialTheme.typography.titleSmall,
            color = if (atRisk) FtColors.Coral else FtColors.TextPrimary,
        )
        if (url != null) {
            AsyncImage(model = avatarRequest(url), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        }
    }
}
