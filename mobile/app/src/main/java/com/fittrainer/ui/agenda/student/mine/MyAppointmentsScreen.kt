package com.fittrainer.ui.agenda.student.mine

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.agenda.student.APPOINTMENT_REQUESTED
import com.fittrainer.ui.agenda.student.MY_APPOINTMENTS_EMPTY
import com.fittrainer.ui.agenda.student.MY_APPOINTMENTS_LOAD_FAILED
import com.fittrainer.ui.agenda.student.MY_APPOINTMENTS_NOT_LOADED
import com.fittrainer.ui.agenda.student.MY_APPOINTMENTS_TITLE
import com.fittrainer.ui.agenda.student.REQUEST_APPOINTMENT
import com.fittrainer.ui.agenda.student.REQUEST_OFFLINE
import com.fittrainer.ui.agenda.student.STUDENT_AGENDA_OFFLINE
import com.fittrainer.ui.agenda.student.components.AgendaLoadError
import com.fittrainer.ui.agenda.student.components.AgendaLoading
import com.fittrainer.ui.agenda.student.components.MyAppointmentRow
import com.fittrainer.ui.agenda.student.components.StudentAgendaHeader
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * «Mis turnos» del alumno (tarjeta 16), desde Perfil o desde un push de turno: de hoy a 60 días, por fecha, con los
 * cancelados al final. Arriba, «Pedir turno» (solo con red). Tocar uno pendiente o confirmado abre su hoja para cancelarlo.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyAppointmentsScreen(
    onBack: () -> Unit,
    onRequest: () -> Unit,
    requestedResult: Boolean = false,
    onResultConsumed: () -> Unit = {},
    viewModel: MyAppointmentsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // El resultado de «Pedir turno» llega por la entrada de navegación; se pasa al ViewModel y se consume.
    LaunchedEffect(requestedResult) {
        if (requestedResult) {
            viewModel.onRequested()
            onResultConsumed()
        }
    }
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    val sheetActions = remember(viewModel) {
        MyAppointmentSheetActions(viewModel::onAskCancel, viewModel::onBackFromCancel, viewModel::onCancelConfirmed, viewModel::onDismissSheet)
    }
    state.sheet?.let { MyAppointmentSheet(it, state.offline, sheetActions) }
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
            item { StudentAgendaHeader(MY_APPOINTMENTS_TITLE, null, onBack) }
            if (state.offline) item { OfflineIndicator(STUDENT_AGENDA_OFFLINE) }
            item { RequestButton(state.offline, onRequest) }
            if (state.requested) item { NoticeBanner(APPOINTMENT_REQUESTED, viewModel::onDismissRequested) }
            state.notice?.let { item { NoticeBanner(it, viewModel::onDismissNotice) } }
            when {
                state.showLoading -> item { AgendaLoading() }
                state.showError -> item { AgendaLoadError(MY_APPOINTMENTS_TITLE, MY_APPOINTMENTS_LOAD_FAILED, viewModel::onRetry) }
                state.showNotLoaded -> item { InfoCard(MY_APPOINTMENTS_TITLE, MY_APPOINTMENTS_NOT_LOADED) }
                state.showEmpty -> item { InfoCard(MY_APPOINTMENTS_TITLE, MY_APPOINTMENTS_EMPTY) }
                state.everSynced -> items(state.items, key = { it.appointment.id }) { item ->
                    MyAppointmentRow(item) { viewModel.onSelect(item.appointment) }
                }
            }
        }
    }
}

/** Pedir y cancelar son solo con red: sin red el botón queda deshabilitado y dice por qué. */
@Composable
private fun RequestButton(offline: Boolean, onRequest: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Button(
            onClick = onRequest,
            enabled = !offline,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
        ) { Text(REQUEST_APPOINTMENT) }
        if (offline) Text(REQUEST_OFFLINE, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    }
}
