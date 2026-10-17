package com.fittrainer.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable

/** Tema único de la app: oscuro (no existe versión clara). */
@Composable
fun FitTrainerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = FtColorScheme,
        typography = FtTypography,
        shapes = FtShapes,
        content = content,
    )
}
