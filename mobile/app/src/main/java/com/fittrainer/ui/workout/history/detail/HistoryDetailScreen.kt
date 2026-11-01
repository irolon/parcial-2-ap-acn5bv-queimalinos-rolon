package com.fittrainer.ui.workout.history.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.detail.components.DetailHeader
import com.fittrainer.ui.workout.history.detail.components.ExerciseBlock
import com.fittrainer.ui.workout.history.detail.components.TrainerCommentCard
import com.fittrainer.ui.workout.history.historyDate
import java.time.ZoneId

/** Progreso → una sesión (tarjeta 12). */
@Composable
fun HistoryDetailScreen(onBack: () -> Unit, viewModel: HistoryDetailViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val zone = remember { ZoneId.systemDefault() }
    val detail = state.detail
    // Solo corre con la pantalla a la vista (el estado se junta con el ciclo de vida): ahí el comentario queda leído.
    val comment = detail?.trainerComment?.takeIf { detail.item.origin == HistoryOrigin.SERVER && it.isNotBlank() }
    LaunchedEffect(comment) { comment?.let(viewModel::onCommentShown) }
    LazyColumn(
        Modifier.fillMaxSize().background(FtColors.Background),
        contentPadding = PaddingValues(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                }
                if (detail != null) {
                    Text(historyDate(detail.item.startedAt, zone), style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
                }
            }
        }
        if (detail != null) {
            item { DetailHeader(detail) }
            detail.trainerComment?.let { item { TrainerCommentCard(it) } }
            if (!detail.detailLoaded) {
                if (state.isOffline) {
                    item { InfoCard("Sin detalle guardado", "El detalle de esta sesión se ve con conexión") }
                } else if (state.error && !state.loading) {
                    item { InfoCard("No pudimos cargar el detalle", "Probá de nuevo") }
                    item { TextButton(onClick = viewModel::retry, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") } }
                } else if (state.loading) {
                    item { Box(Modifier.fillMaxWidth().padding(Spacing.lg), Alignment.Center) { CircularProgressIndicator() } }
                }
            }
            items(detail.exercises) { ExerciseBlock(it) }
        } else if (state.missing) {
            item { InfoCard("No encontramos esta sesión", "Puede que se haya borrado. Volvé al historial.") }
            item { OutlinedButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Volver") } }
        }
    }
}
