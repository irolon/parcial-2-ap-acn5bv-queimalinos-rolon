package com.fittrainer.ui.students.detail

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.students.detail.StudentDetail
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.detail.components.DataCard
import com.fittrainer.ui.students.detail.components.DetailHeader
import com.fittrainer.ui.students.detail.components.DisableDialog
import com.fittrainer.ui.students.detail.components.LatestMetricsCard
import com.fittrainer.ui.students.detail.components.RoutineCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/**
 * Ficha del alumno (prototipo EM_PerfilAlumno). Es una columna de secciones: E4, E5 y E6 suman las
 * suyas con [extraSections]. "Mensaje" y "Asignar rutina" no están hasta E11 y E8.
 */
@Composable
fun StudentDetailScreen(
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onGone: () -> Unit,
    onOpenMetrics: ((openNew: Boolean) -> Unit)? = null,
    extraSections: LazyListScope.(offline: Boolean, detail: StudentDetail) -> Unit = { _, _ -> },
    viewModel: StudentDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    val context = LocalContext.current
    LaunchedEffect(state.gone) {
        if (state.gone) {
            Toast.makeText(context, DETAIL_GONE, Toast.LENGTH_LONG).show()
            onGone()
        }
    }
    val detail = state.detail
    if (state.confirmDisable && detail != null) {
        DisableDialog(detail.name, viewModel::onConfirmDisable, viewModel::onCancelDisable)
    }
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
                Text(DETAIL_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        if (state.offline) {
            item { OfflineIndicator(state.syncedLabel?.let { "Sin conexión · $it · $DETAIL_NEEDS_NETWORK" } ?: "Sin conexión") }
        }
        state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
        when {
            !state.loaded -> Unit
            detail == null -> if (!state.refreshing) item { InfoCard("Sin datos", DETAIL_NOT_LOADED) }
            else -> {
                item { DetailHeader(detail.name, state.header, state.status) }
                item { RoutineCard(detail) }
                item {
                    LatestMetricsCard(
                        detail,
                        onHistory = onOpenMetrics?.let { { it(false) } },
                        onNew = onOpenMetrics?.let { { it(true) } },
                        canWrite = !state.offline,
                    )
                }
                extraSections(state.offline, detail)
                item { DataCard(detail) }
                item { Actions(state, onEdit, viewModel::onDisable, viewModel::onReactivate) }
            }
        }
    }
}

@Composable
private fun Actions(state: StudentDetailUiState, onEdit: () -> Unit, onDisable: () -> Unit, onReactivate: () -> Unit) {
    val active = state.detail?.active ?: return
    androidx.compose.foundation.layout.Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        OutlinedButton(onClick = onEdit, enabled = state.canAct, modifier = Modifier.fillMaxWidth().height(52.dp)) {
            Text("Editar datos")
        }
        if (active) {
            OutlinedButton(onClick = onDisable, enabled = state.canAct, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Text("Dar de baja", color = if (state.canAct) FtColors.Coral else FtColors.TextSecondary)
            }
        } else {
            Button(
                onClick = onReactivate,
                enabled = state.canAct,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
            ) { Text("Reactivar") }
        }
    }
}
