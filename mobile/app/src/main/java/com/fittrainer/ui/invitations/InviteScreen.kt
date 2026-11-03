package com.fittrainer.ui.invitations

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.invitations.components.InviteFormFields
import com.fittrainer.ui.invitations.components.InviteResult
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Invitar alumno (prototipo EM_QR): formulario y, al generar, el QR y los botones para compartir. */
@Composable
fun InviteScreen(onBack: () -> Unit, viewModel: InviteViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    Column(
        Modifier.fillMaxSize().background(FtColors.Background).verticalScroll(rememberScrollState()).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
            }
            Text(INVITE_TITLE, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
        }
        when (val s = state) {
            is InviteUiState.Editing -> InviteFormFields(s, viewModel)
            is InviteUiState.Done -> InviteResult(
                state = s,
                onWhatsapp = {
                    val url = s.invitation.whatsappUrl
                    if (url != null && context.open(Intent(Intent.ACTION_VIEW, Uri.parse(url)))) return@InviteResult
                    context.share(shareText(s.studentName, s.invitation.joinUrl))
                },
                onShare = { context.share(shareText(s.studentName, s.invitation.joinUrl)) },
                onInviteAnother = viewModel::onInviteAnother,
            )
        }
    }
}

/** false si no hay ninguna app que lo abra (por ejemplo, WhatsApp no instalado). */
private fun Context.open(intent: Intent): Boolean = try {
    startActivity(intent)
    true
} catch (e: ActivityNotFoundException) {
    false
}

private fun Context.share(text: String) {
    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
    open(Intent.createChooser(send, "Compartir invitación"))
}
