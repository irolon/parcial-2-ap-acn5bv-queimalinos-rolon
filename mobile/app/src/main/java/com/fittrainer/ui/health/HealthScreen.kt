package com.fittrainer.ui.health

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.repository.HealthSnapshot
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val hourFormat = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault())

private fun formatHour(epochMillis: Long): String = hourFormat.format(Instant.ofEpochMilli(epochMillis))

private val secondsFormat = DateTimeFormatter.ofPattern("HH:mm:ss").withZone(ZoneId.systemDefault())

/** Hora del servidor en la zona del dispositivo; si no es un ISO válido, se muestra tal cual. */
private fun formatServerTime(iso: String): String =
    runCatching { secondsFormat.format(Instant.parse(iso)) }.getOrDefault(iso)

@Composable
fun HealthScreen(onBack: () -> Unit, viewModel: HealthViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    HealthContent(state = state, onRetry = viewModel::retry, onBack = onBack)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HealthContent(state: HealthUiState, onRetry: () -> Unit, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Estado del servidor") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
            )
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (state.isRefreshing) LinearProgressIndicator(Modifier.fillMaxWidth())

            val snapshot = state.snapshot
            val error = state.error
            if (snapshot != null && error != null) StaleDataBanner(error, snapshot.fetchedAt)

            when {
                snapshot != null -> SnapshotDetails(snapshot, onRetry, state.isRefreshing)
                !state.isRefreshing -> EmptyState(state.error, onRetry)
            }
        }
    }
}

/** Falló el refresh pero hay caché: el motivo real (sin red, HTTP, otro) y la hora de los datos guardados. */
@Composable
private fun StaleDataBanner(error: String, fetchedAt: Long) {
    Text(
        text = "$error — mostrando datos guardados de las ${formatHour(fetchedAt)}",
        style = MaterialTheme.typography.bodyMedium,
        color = FtColors.Background,
        modifier = Modifier
            .fillMaxWidth()
            .background(FtColors.Amber)
            .padding(horizontal = Spacing.lg, vertical = Spacing.md),
    )
}

@Composable
private fun SnapshotDetails(snapshot: HealthSnapshot, onRetry: () -> Unit, isRefreshing: Boolean) {
    Column(
        modifier = Modifier.padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Text("ESTADO", style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
        Text(
            snapshot.status.uppercase(),
            style = MaterialTheme.typography.displayLarge,
            color = if (snapshot.status == "ok") FtColors.Green else FtColors.Coral,
        )
        Text("Versión ${snapshot.version}", style = MaterialTheme.typography.bodyLarge)
        Text("Hora del servidor: ${formatServerTime(snapshot.serverTimestamp)}", style = MaterialTheme.typography.bodyMedium)
        Text(
            "Actualizado a las ${formatHour(snapshot.fetchedAt)}",
            style = MaterialTheme.typography.bodyMedium,
            color = FtColors.TextSecondary,
        )
        OutlinedButton(
            onClick = onRetry,
            enabled = !isRefreshing,
            modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
        ) { Text("Actualizar") }
    }
}

@Composable
private fun EmptyState(error: String?, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(Spacing.lg), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Text("Sin datos del servidor", style = MaterialTheme.typography.titleLarge)
            if (error != null) Text(error, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
            Button(onClick = onRetry, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") }
        }
    }
}
