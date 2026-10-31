package com.fittrainer.ui.workout.history.components

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.workout.history.syncMarkText

/** "Sin subir" (ámbar, se reintenta) o "No se pudo subir" (color de error, rechazada); nada si la sesión ya está subida. */
@Composable
fun SyncMark(origin: HistoryOrigin) {
    val text = syncMarkText(origin) ?: return
    val color = if (origin == HistoryOrigin.LOCAL_FAILED) FtColors.Coral else FtColors.Amber
    Text(text, style = MaterialTheme.typography.labelMedium, color = color)
}
