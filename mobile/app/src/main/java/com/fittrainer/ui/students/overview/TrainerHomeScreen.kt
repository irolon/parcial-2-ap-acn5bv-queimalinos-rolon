package com.fittrainer.ui.students.overview

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.students.overview.TrainerOverview
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.overview.components.DayCard
import com.fittrainer.ui.students.overview.components.FeedbackRow
import com.fittrainer.ui.students.overview.components.FilterGrid
import com.fittrainer.ui.students.overview.components.HomeHeader
import com.fittrainer.ui.students.overview.components.PendingTodaySheet
import com.fittrainer.ui.students.overview.components.RiskRow
import com.fittrainer.ui.students.overview.components.StudentRow
import com.fittrainer.ui.students.overview.components.TodayRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Adónde llevan las filas: la ficha (E3) o el detalle de una sesión para comentar (E4). */
class HomeNavigation(val onStudent: (String) -> Unit, val onSession: (studentId: String, sessionId: String) -> Unit, val onInvite: () -> Unit)

/** Inicio del entrenador: el día primero (tarjeta del día) y una lista por filtro. La campana real es de E12. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrainerHomeScreen(nav: HomeNavigation, viewModel: TrainerHomeViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    val showToday = { viewModel.onFilter(HomeFilter.TODAY) }
    var bellOpen by rememberSaveable { mutableStateOf(false) }
    if (bellOpen) {
        PendingTodaySheet(state.overview?.missingToday.orEmpty(), { bellOpen = false; nav.onStudent(it) }, { bellOpen = false })
    }
    PullToRefreshBox(state.refreshing, viewModel::onPullToRefresh, Modifier.fillMaxSize().background(FtColors.Background)) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            val o = state.overview
            item {
                HomeHeader(state.today?.let(::headerDate), greeting(state.name), o?.missingToday?.size ?: 0, { bellOpen = true }) {
                    if (state.offline) OfflineIndicator(state.syncedLabel?.let { "Sin conexión · $it" } ?: "Sin conexión")
                }
            }
            if (o != null && !state.offline) state.error?.let { item { NoticeBanner(it, viewModel::dismissError) } }
            when {
                !state.loaded -> Unit
                state.showErrorScreen -> item { RetryCard(state.error.orEmpty(), viewModel::onRetry) }
                o == null -> Unit
                state.noStudents -> item { InviteCard(nav.onInvite) }
                else -> {
                    item { DayCard(o, showToday) }
                    item { FilterGrid(o, state.filter, viewModel::onFilter) }
                    filterItems(o, state, nav)
                }
            }
        }
    }
}

private fun LazyListScope.filterItems(o: TrainerOverview, state: TrainerHomeUiState, nav: HomeNavigation) {
    val filter = state.filter
    if (filter == HomeFilter.STUDENTS) adherenceSummary(o.adherencePct, o.adherenceDelta)?.let { item { SectionText(it) } }
    if (filterCount(o, filter) == 0 || (filter == HomeFilter.STUDENTS && o.students.isEmpty())) {
        item { SectionText(filter.empty) }
        return
    }
    when (filter) {
        HomeFilter.TODAY -> items(o.today, key = { "t-${it.studentId}" }) { t ->
            TodayRow(t) { if (t.sessionId != null) nav.onSession(t.studentId, t.sessionId) else nav.onStudent(t.studentId) }
        }
        HomeFilter.RISK -> items(o.atRisk, key = { "r-${it.studentId}" }) { r -> RiskRow(r) { nav.onStudent(r.studentId) } }
        HomeFilter.FEEDBACK -> items(o.feedback, key = { "f-${it.sessionId}" }) { f ->
            FeedbackRow(f, state.now) { nav.onSession(f.studentId, f.sessionId) }
        }
        HomeFilter.STUDENTS -> items(o.students, key = { "s-${it.studentId}" }) { s -> StudentRow(s) { nav.onStudent(s.studentId) } }
    }
}

@Composable
private fun SectionText(text: String) {
    Text(text, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
}

@Composable
private fun InviteCard(onInvite: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        InfoCard(HOME_INVITE_TITLE, HOME_INVITE_BODY)
        Button(onClick = onInvite, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) { Text(HOME_INVITE_TITLE) }
    }
}

@Composable
private fun RetryCard(message: String, onRetry: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        InfoCard(HOME_ERROR_TITLE, message)
        Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") }
    }
}
