package com.fittrainer.ui.invitations.components

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.invitations.INVITE_ANOTHER
import com.fittrainer.ui.invitations.INVITE_SHARE
import com.fittrainer.ui.invitations.INVITE_WHATSAPP
import com.fittrainer.ui.invitations.InviteUiState
import com.fittrainer.ui.invitations.expiryText
import com.fittrainer.ui.invitations.scanText
import com.fittrainer.ui.invitations.shortLink
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant

@Composable
fun InviteResult(state: InviteUiState.Done, onWhatsapp: () -> Unit, onShare: () -> Unit, onInviteAnother: () -> Unit) {
    val invitation = state.invitation
    // Sin QR legible igual se muestran el link y los botones.
    val qr: ImageBitmap? = remember(invitation) {
        invitation.qrPng?.let { BitmapFactory.decodeByteArray(it, 0, it.size)?.asImageBitmap() }
    }
    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        if (qr != null) {
            Box(Modifier.background(Color.White, MaterialTheme.shapes.large).padding(Spacing.lg)) {
                Image(qr, contentDescription = "Código QR de la invitación", Modifier.size(240.dp), filterQuality = FilterQuality.None)
            }
        }
        Text(scanText(state.studentName), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text(
            "${expiryText(invitation.expiresAt, Instant.now())} · ${shortLink(invitation.joinUrl)}",
            style = MaterialTheme.typography.labelSmall,
            color = FtColors.TextSecondary,
        )
        Button(onClick = onWhatsapp, modifier = Modifier.fillMaxWidth().height(56.dp)) { Text(INVITE_WHATSAPP) }
        OutlinedButton(onClick = onShare, modifier = Modifier.fillMaxWidth().height(56.dp)) { Text(INVITE_SHARE) }
        TextButton(onClick = onInviteAnother, modifier = Modifier.height(Spacing.minTouchTarget)) { Text(INVITE_ANOTHER) }
    }
}
