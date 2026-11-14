package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors

/** El backend manda icon_url en null: el ícono sale de la categoría (contratos-api, GET /achievements). */
fun categoryIcon(category: String?): ImageVector = when (category) {
    "streak" -> GamificationIcons.Fire
    "pr" -> GamificationIcons.Trophy
    "consistency" -> GamificationIcons.Calendar
    else -> GamificationIcons.Flag
}

/** Racha en coral; el resto de los logros en verde. */
fun medalColor(category: String?): Color = if (category == "streak") FtColors.Coral else FtColors.Green

@Composable
fun MedalIcon(category: String?, unlocked: Boolean, size: Dp = 56.dp) {
    val tint = if (unlocked) medalColor(category) else FtColors.Ink5
    Box(
        Modifier.size(size).clip(CircleShape).background(if (unlocked) tint.copy(alpha = 0.16f) else FtColors.Elevated),
        contentAlignment = Alignment.Center,
    ) {
        Icon(categoryIcon(category), contentDescription = null, tint = tint, modifier = Modifier.size(size / 2))
    }
}
