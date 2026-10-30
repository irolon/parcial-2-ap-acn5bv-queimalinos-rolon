package com.fittrainer.ui.sync.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.sync.UploadsNoticeUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing

/** Aviso chico de Hoy con lo que falta subir, "Subir ahora" y, si hay rechazos, la X para descartarlos (spec §6). */
@Composable
fun UploadsNotice(ui: UploadsNoticeUi, onUploadNow: () -> Unit, onDismissFailures: () -> Unit) {
    val shape = RoundedCornerShape(FtRadius.card)
    Row(
        Modifier.fillMaxWidth().background(FtColors.Card, shape).border(1.dp, FtColors.Border, shape)
            .padding(horizontal = Spacing.md, vertical = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(
            ui.text,
            style = MaterialTheme.typography.labelMedium,
            color = FtColors.TextSecondary,
            modifier = Modifier.weight(1f).padding(vertical = Spacing.sm),
        )
        when {
            ui.uploading -> Box(Modifier.size(44.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
            }
            ui.canUpload -> TextButton(onClick = onUploadNow, modifier = Modifier.heightIn(min = 44.dp)) {
                Text("Subir ahora")
            }
        }
        if (ui.canDismiss && !ui.uploading) {
            IconButton(onClick = onDismissFailures) {
                Icon(Icons.Filled.Close, contentDescription = "Descartar aviso de lo que no se pudo subir", tint = FtColors.TextSecondary)
            }
        }
    }
}
