package com.fittrainer.ui.messages.student.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.fittrainer.ui.messages.student.PHOTO_PREVIEW
import com.fittrainer.ui.messages.student.PICK_PHOTO
import com.fittrainer.ui.messages.student.REMOVE_PHOTO
import com.fittrainer.ui.messages.student.TAKE_PHOTO
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** La miniatura de la foto elegida, arriba de la caja, con la ✕ para sacarla (44 dp de toque). */
@Composable
fun PhotoAttachment(uri: String, enabled: Boolean, onRemove: () -> Unit) {
    Box(Modifier.padding(bottom = Spacing.sm)) {
        AsyncImage(
            model = uri,
            contentDescription = PHOTO_PREVIEW,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(96.dp).clip(RoundedCornerShape(12.dp)),
        )
        FilledIconButton(
            onClick = onRemove,
            enabled = enabled,
            modifier = Modifier.align(Alignment.TopEnd).size(Spacing.minTouchTarget).padding(6.dp),
            shape = CircleShape,
            colors = IconButtonDefaults.filledIconButtonColors(containerColor = FtColors.Elevated),
        ) { Icon(Icons.Filled.Close, contentDescription = REMOVE_PHOTO, tint = FtColors.TextPrimary) }
    }
}

/** La hoja de adjuntar: sacar una foto o elegirla de la galería. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttachSheet(onDismiss: () -> Unit, onCamera: () -> Unit, onGallery: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = FtColors.Surface) {
        Column(Modifier.fillMaxWidth().padding(horizontal = Spacing.md, vertical = Spacing.sm)) {
            for ((label, action) in listOf(TAKE_PHOTO to onCamera, PICK_PHOTO to onGallery)) {
                TextButton(
                    onClick = { onDismiss(); action() },
                    modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                ) { Text(label, color = FtColors.TextPrimary) }
            }
        }
    }
}
