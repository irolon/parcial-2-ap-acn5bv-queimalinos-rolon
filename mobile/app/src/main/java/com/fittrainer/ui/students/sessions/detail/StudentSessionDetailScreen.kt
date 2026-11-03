package com.fittrainer.ui.students.sessions.detail

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.sessions.COMMENT_GONE
import com.fittrainer.ui.students.sessions.DETAIL_NOT_LOADED
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.students.sessions.components.TrainerCommentEditor
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.detail.components.DetailHeader
import com.fittrainer.ui.workout.history.detail.components.ExerciseBlock

/** Detalle de una sesión del alumno (los mismos componentes que el historial del alumno) y el comentario. */
@Composable
fun StudentSessionDetailScreen(onBack: () -> Unit, onGone: () -> Unit = onBack, viewModel: StudentSessionDetailViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    val context = LocalContext.current
    LaunchedEffect(state.gone) {
        if (state.gone) {
            Toast.makeText(context, COMMENT_GONE, Toast.LENGTH_LONG).show()
            onGone()
        }
    }
    val detail = state.detail
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
                Text("Sesión", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        if (state.offline) item { OfflineIndicator("Sin conexión · mostrando lo guardado") }
        state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
        state.loadError?.let { item { RetryRow(it, viewModel::onRetry) } }
        when {
            !state.loaded -> Unit
            detail == null -> if (state.loadError == null) item { InfoCard("Sin datos", DETAIL_NOT_LOADED) }
            else -> {
                item { DetailHeader(detail) }
                item { TrainerCommentEditor(state, viewModel::onDraft, viewModel::onSave, viewModel::onDelete) }
                if (!detail.detailLoaded) item { InfoCard("Detalle", DETAIL_NOT_LOADED) }
                items(detail.exercises) { ExerciseBlock(it) }
            }
        }
    }
}

