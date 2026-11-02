package com.fittrainer.ui.messages.trainer.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.fittrainer.data.messages.trainer.Message
import com.fittrainer.ui.messages.trainer.BROADCAST_TAG
import com.fittrainer.ui.messages.trainer.PHOTO
import com.fittrainer.ui.messages.trainer.PHOTO_UNAVAILABLE
import com.fittrainer.ui.messages.trainer.bubbleTime
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.ZoneId

/**
 * Burbuja del prototipo EM_Mensajes: el alumno a la izquierda en gris y el PT a la derecha en azul, con
 * la hora y "✓✓" cuando el alumno ya lo leyó. Los de una difusión llevan la etiqueta DIFUSIÓN.
 */
@Composable
fun MessageBubble(message: Message, zone: ZoneId) {
    val mine = message.fromTrainer
    val shape = if (mine) RoundedCornerShape(18.dp, 18.dp, 4.dp, 18.dp) else RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp)
    Box(Modifier.fillMaxWidth(), contentAlignment = if (mine) Alignment.CenterEnd else Alignment.CenterStart) {
        Column(
            Modifier.fillMaxWidth(0.82f),
            horizontalAlignment = if (mine) Alignment.End else Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (message.broadcast) {
                Text(BROADCAST_TAG, style = MaterialTheme.typography.labelSmall, color = FtColors.BrandText)
            }
            Column(
                Modifier.clip(shape)
                    .background(if (mine) FtColors.Brand else FtColors.Surface)
                    .then(if (mine) Modifier else Modifier.border(1.dp, FtColors.Elevated, shape))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(Spacing.xs),
            ) {
                message.imageUrl?.let { url ->
                    AsyncImage(
                        model = url,
                        contentDescription = PHOTO,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.widthIn(max = 240.dp).heightIn(max = 240.dp).clip(RoundedCornerShape(12.dp)),
                    )
                }
                message.body?.let { Text(it, style = MaterialTheme.typography.bodyLarge, color = FtColors.TextPrimary) }
                // Solo foto y sin URL: el backend no la pudo firmar; vuelve en el próximo refresco.
                if (message.body == null && message.imageUrl == null) {
                    Text(PHOTO_UNAVAILABLE, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
                }
            }
            Text(
                bubbleTime(message.at, zone) + if (mine && message.read) " · ✓✓" else "",
                style = MaterialTheme.typography.labelSmall,
                color = FtColors.TextSecondary,
                textAlign = if (mine) TextAlign.End else TextAlign.Start,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
        }
    }
}
