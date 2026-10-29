package com.fittrainer.ui.sync.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing

/** Aviso chico de Hoy con lo que falta subir (spec §6). Desaparece solo cuando se sube. */
@Composable
fun UploadsNotice(text: String) {
    val shape = RoundedCornerShape(FtRadius.card)
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = FtColors.TextSecondary,
        modifier = Modifier.fillMaxWidth().background(FtColors.Card, shape).border(1.dp, FtColors.Border, shape).padding(Spacing.md),
    )
}
