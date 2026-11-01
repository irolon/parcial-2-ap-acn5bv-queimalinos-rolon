package com.fittrainer.ui.students.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors

/** Círculo con las iniciales; en riesgo va en coral. */
@Composable
fun StudentAvatar(initials: String, atRisk: Boolean, size: Dp = 44.dp) {
    Box(
        Modifier.size(size).background(if (atRisk) FtColors.Coral.copy(alpha = 0.18f) else FtColors.Elevated, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            initials,
            style = MaterialTheme.typography.titleSmall,
            color = if (atRisk) FtColors.Coral else FtColors.TextPrimary,
        )
    }
}
