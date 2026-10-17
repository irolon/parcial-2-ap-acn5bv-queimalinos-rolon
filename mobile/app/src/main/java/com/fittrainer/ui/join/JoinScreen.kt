package com.fittrainer.ui.join

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.join.components.CameraAccess
import com.fittrainer.ui.join.components.QrScanner
import com.fittrainer.ui.join.components.PasteLink
import com.fittrainer.ui.join.components.appSettingsIntent
import com.fittrainer.ui.join.components.findActivity
import com.fittrainer.ui.join.components.hasCameraPermission
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing

@Composable
fun JoinScreen(onBack: () -> Unit, onToken: (String) -> Unit, viewModel: JoinViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var access by remember { mutableStateOf(if (context.hasCameraPermission()) CameraAccess.Granted else CameraAccess.NotAsked) }
    var cameraFailed by rememberSaveable { mutableStateOf(false) }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        access = when {
            granted -> CameraAccess.Granted
            // Después de un rechazo, si Android ya no muestra el diálogo, solo queda Ajustes.
            context.findActivity()?.shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) == true -> CameraAccess.Denied
            else -> CameraAccess.PermanentlyDenied
        }
    }

    // Vuelve de Ajustes con el permiso concedido.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        if (context.hasCameraPermission()) access = CameraAccess.Granted
    }

    LaunchedEffect(state.token) {
        state.token?.let {
            viewModel.onNavigated()
            onToken(it)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg),
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
        }
        Text("Escaneá el código de tu entrenador", style = MaterialTheme.typography.displayMedium)

        when {
            access == CameraAccess.Granted && !cameraFailed -> {
                QrScanner(
                    onQrScanned = viewModel::onQrScanned,
                    onCameraError = { cameraFailed = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(FtRadius.card))
                        .border(2.dp, FtColors.Brand, RoundedCornerShape(FtRadius.card)),
                )
                state.scanError?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.Amber) }
            }
            cameraFailed -> Text(
                "No se pudo abrir la cámara. Pegá el link de la invitación.",
                style = MaterialTheme.typography.bodyLarge,
                color = FtColors.TextSecondary,
            )
            access == CameraAccess.NotAsked -> {
                Text(
                    "Necesitamos la cámara para escanear el código de tu entrenador",
                    style = MaterialTheme.typography.bodyLarge,
                    color = FtColors.TextSecondary,
                )
                Button(
                    onClick = { launcher.launch(Manifest.permission.CAMERA) },
                    shape = RoundedCornerShape(FtRadius.control),
                    modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                ) { Text("Permitir cámara") }
            }
            else -> {
                Text(
                    "Sin la cámara no podemos escanear, pero podés pegar el link que te mandó tu entrenador.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = FtColors.TextSecondary,
                )
                if (access == CameraAccess.PermanentlyDenied) {
                    OutlinedButton(
                        onClick = { context.startActivity(appSettingsIntent(context)) },
                        shape = RoundedCornerShape(FtRadius.control),
                        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    ) { Text("Abrir ajustes") }
                } else {
                    OutlinedButton(
                        onClick = { launcher.launch(Manifest.permission.CAMERA) },
                        shape = RoundedCornerShape(FtRadius.control),
                        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    ) { Text("Permitir cámara") }
                }
            }
        }

        PasteLink(
            link = state.link,
            error = state.linkError,
            onLinkChange = viewModel::onLinkChange,
            onSubmit = viewModel::submitLink,
        )
    }
}
