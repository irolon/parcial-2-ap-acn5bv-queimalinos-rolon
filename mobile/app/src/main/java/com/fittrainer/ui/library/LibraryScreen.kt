package com.fittrainer.ui.library

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.ExerciseDetailSheet
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.library.components.MuscleChips
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Biblioteca de ejercicios del alumno (sin mockup: componentes y tema de la Rutina del día). */
@Composable
fun LibraryScreen(onBack: (() -> Unit)? = null, viewModel: LibraryViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    LibraryBody(state, viewModel::onPullToRefresh, viewModel::onSelectGroup, viewModel::dismissNotice, onBack)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryBody(
    state: LibraryUiState,
    onRefresh: () -> Unit,
    onSelectGroup: (String?) -> Unit,
    onDismissNotice: () -> Unit,
    onBack: (() -> Unit)? = null,
) {
    var selected by remember { mutableStateOf<LibraryExercise?>(null) }
    PullToRefreshBox(
        isRefreshing = state.isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                        onBack?.let {
                            IconButton(onClick = it, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                            }
                        }
                        Text(LIBRARY_TITLE, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
                    }
                    if (state.isOffline) OfflineIndicator(if (state.everSynced) LIBRARY_OFFLINE else "Sin conexión")
                }
            }
            state.notice?.let { notice -> item { NoticeBanner(notice, onDismissNotice) } }
            when {
                !state.loaded -> Unit
                !state.everSynced -> state.firstLoad?.let { card ->
                    item {
                        when (card) {
                            FirstLoadCard.Connect -> InfoCard(LIBRARY_NO_DATA_TITLE, LIBRARY_NO_DATA_BODY)
                            FirstLoadCard.Retry -> InfoCard(LIBRARY_RETRY_TITLE, LIBRARY_RETRY_BODY)
                        }
                    }
                }
                state.isEmpty -> item {
                    InfoCard("Biblioteca vacía", "Tu entrenador todavía no cargó ejercicios.")
                }
                else -> {
                    item { MuscleChips(state.groups, state.selectedGroup, onSelectGroup) }
                    items(state.exercises, key = { it.id }) { exercise ->
                        ExerciseRow(exercise.name, librarySubtitle(exercise), onClick = { selected = exercise })
                    }
                }
            }
        }
    }
    selected?.let { exercise ->
        ExerciseDetailSheet(exercise.toDetail(), canOpenVideo = !state.isOffline, onDismiss = { selected = null })
    }
}
