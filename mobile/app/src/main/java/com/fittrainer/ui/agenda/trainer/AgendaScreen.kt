package com.fittrainer.ui.agenda.trainer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.agenda.AGENDA_RETRY
import com.fittrainer.ui.agenda.trainer.components.AgendaHeader
import com.fittrainer.ui.agenda.trainer.components.AgendaLegend
import com.fittrainer.ui.agenda.trainer.components.DayCard
import com.fittrainer.ui.agenda.trainer.components.WeekBar
import com.fittrainer.ui.agenda.trainer.components.WeekBarActions
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * Agenda del entrenador (E13), desde Más: la semana en lista por día, como la web debajo de 768 px. Tocar un turno
 * abre su hoja, desde donde se confirma o se cancela. «Nuevo turno» y la disponibilidad se editan en la web.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgendaScreen(onBack: () -> Unit, viewModel: AgendaViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    val weekActions = remember(viewModel) {
        WeekBarActions(viewModel::onPrevWeek, viewModel::onThisWeek, viewModel::onNextWeek, viewModel::onToggleCancelled)
    }
    val sheetActions = remember(viewModel) {
        AppointmentSheetActions(viewModel::onConfirm, viewModel::onAskCancel, viewModel::onBackFromCancel, viewModel::onCancelConfirmed, viewModel::onDismissSheet)
    }
    state.sheet?.let { AppointmentSheet(it, state.offline, sheetActions) }
    PullToRefreshBox(
        isRefreshing = state.refreshing && state.everSynced,
        onRefresh = viewModel::onPullToRefresh,
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item { AgendaHeader(weekTitle(state.weekStart), onBack) }
            if (state.offline) item { OfflineIndicator(AGENDA_OFFLINE) }
            item { WeekBar(state.showCancelled, weekActions) }
            state.notice?.let { item { NoticeBanner(it, viewModel::onDismissNotice) } }
            when {
                state.showLoading -> item { Loading() }
                state.showError -> item { LoadError(viewModel::onRetry) }
                state.showNotLoaded -> item { InfoCard(AGENDA_TITLE, AGENDA_NOT_LOADED) }
                state.everSynced -> {
                    items(state.days, key = { it.date.toString() }) { day -> DayCard(day, viewModel::onSelect) }
                    item { AgendaLegend() }
                }
            }
        }
    }
}

@Composable
private fun Loading() {
    Box(Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = FtColors.Brand)
    }
}

@Composable
private fun LoadError(onRetry: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        InfoCard(AGENDA_TITLE, AGENDA_LOAD_FAILED)
        Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) { Text(AGENDA_RETRY) }
    }
}
