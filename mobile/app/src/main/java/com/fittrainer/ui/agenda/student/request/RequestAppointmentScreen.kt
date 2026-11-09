package com.fittrainer.ui.agenda.student.request

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.agenda.student.FREE_SLOTS_EMPTY
import com.fittrainer.ui.agenda.student.FREE_SLOTS_LOAD_FAILED
import com.fittrainer.ui.agenda.student.FREE_SLOTS_NOT_LOADED
import com.fittrainer.ui.agenda.student.FREE_SLOTS_OFFLINE
import com.fittrainer.ui.agenda.student.FREE_SLOTS_SUBTITLE
import com.fittrainer.ui.agenda.student.NO_TRAINER
import com.fittrainer.ui.agenda.student.REQUEST_APPOINTMENT
import com.fittrainer.ui.agenda.student.components.AgendaLoadError
import com.fittrainer.ui.agenda.student.components.AgendaLoading
import com.fittrainer.ui.agenda.student.components.SlotDayCard
import com.fittrainer.ui.agenda.student.components.StudentAgendaHeader
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * «Pedir turno» (tarjeta 16): los horarios libres de las próximas 4 semanas, agrupados por día, solo los que dio el
 * servidor. Tocar uno abre la hoja con la nota; si sale bien, [onRequested] vuelve a «Mis turnos» con el aviso.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestAppointmentScreen(onBack: () -> Unit, onRequested: () -> Unit, viewModel: RequestAppointmentViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    LaunchedEffect(state.requested) {
        if (state.requested) {
            viewModel.onRequestedHandled()
            onRequested()
        }
    }
    val sheetActions = remember(viewModel) { RequestSheetActions(viewModel::onNoteChange, viewModel::onSubmit, viewModel::onDismissSheet) }
    state.sheet?.let { RequestSheet(it, viewModel.note, state.offline, sheetActions) }
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
            item { StudentAgendaHeader(REQUEST_APPOINTMENT, FREE_SLOTS_SUBTITLE, onBack) }
            if (state.offline) item { OfflineIndicator(FREE_SLOTS_OFFLINE) }
            state.notice?.let { item { NoticeBanner(it, viewModel::onDismissNotice) } }
            when {
                state.showNoTrainer -> item { InfoCard(REQUEST_APPOINTMENT, NO_TRAINER) }
                state.showLoading -> item { AgendaLoading() }
                state.showError -> item { AgendaLoadError(REQUEST_APPOINTMENT, FREE_SLOTS_LOAD_FAILED, viewModel::onRetry) }
                state.showNotLoaded -> item { InfoCard(REQUEST_APPOINTMENT, FREE_SLOTS_NOT_LOADED) }
                state.showEmpty -> item { InfoCard(REQUEST_APPOINTMENT, FREE_SLOTS_EMPTY) }
                state.everSynced -> items(state.days, key = { it.date.toString() }) { day -> SlotDayCard(day, viewModel::onSelectSlot) }
            }
        }
    }
}
