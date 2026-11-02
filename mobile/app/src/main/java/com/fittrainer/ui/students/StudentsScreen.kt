package com.fittrainer.ui.students

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.students.StudentFilter
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.components.StudentFilters
import com.fittrainer.ui.students.components.StudentRow
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Pestaña Alumnos del entrenador (prototipo EM_Alumnos). */
@Composable
fun StudentsScreen(onInvite: () -> Unit = {}, onOpen: (String) -> Unit = {}, viewModel: StudentsViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    StudentsBody(
        state,
        StudentsActions(
            viewModel::onPullToRefresh, viewModel::onRetry, viewModel::onFilter, viewModel::onQuery, viewModel::dismissError, onInvite, onOpen,
        ),
    )
}

class StudentsActions(
    val onRefresh: () -> Unit,
    val onRetry: () -> Unit,
    val onFilter: (StudentFilter) -> Unit,
    val onQuery: (String) -> Unit,
    val onDismissError: () -> Unit,
    val onInvite: () -> Unit,
    val onOpen: (String) -> Unit,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentsBody(state: StudentsUiState, actions: StudentsActions) {
    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = actions.onRefresh,
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item { Header(state, actions) }
            // Sin red el indicador ya lo dice; el aviso es para los errores con red.
            if (state.everSynced && !state.offline) state.error?.let { item { NoticeBanner(it, actions.onDismissError) } }
            when {
                !state.loaded -> Unit
                state.showErrorScreen -> item { ErrorState(state.error.orEmpty(), actions.onRetry) }
                !state.everSynced -> Unit
                !state.hasStudents -> item { EmptyState(actions.onInvite) }
                state.students.isEmpty() -> item { InfoCard("Sin resultados", STUDENTS_NO_MATCH) }
                else -> items(state.students, key = { it.id }) { row -> StudentRow(row, onClick = { actions.onOpen(row.id) }) }
            }
        }
    }
}

@Composable
private fun Header(state: StudentsUiState, actions: StudentsActions) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        if (state.everSynced) {
            Text(
                headerCounts(state.counts.active, state.counts.atRisk),
                style = MaterialTheme.typography.labelMedium,
                color = FtColors.TextSecondary,
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(STUDENTS_TITLE, Modifier.weight(1f), style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
            FilledIconButton(onClick = actions.onInvite, modifier = Modifier.size(Spacing.minTouchTarget)) {
                Icon(Icons.Filled.Add, contentDescription = STUDENTS_INVITE)
            }
        }
        if (state.offline) OfflineIndicator(state.syncedLabel?.let { "Sin conexión · $it" } ?: "Sin conexión")
        OutlinedTextField(
            value = state.query,
            onValueChange = actions.onQuery,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(STUDENTS_SEARCH_HINT) },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            singleLine = true,
        )
        StudentFilters(state.filter, actions.onFilter)
    }
}

@Composable
private fun EmptyState(onInvite: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        InfoCard(STUDENTS_EMPTY_TITLE, STUDENTS_EMPTY_BODY)
        Button(onClick = onInvite, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) {
            Text(STUDENTS_INVITE_FIRST)
        }
    }
}

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        InfoCard(STUDENTS_ERROR_TITLE, message)
        Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) {
            Text(STUDENTS_RETRY)
        }
    }
}
