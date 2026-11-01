package com.fittrainer.ui.templates.trainer.list

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.templates.trainer.TemplateSummary
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.students.sessions.components.RetryRow
import com.fittrainer.ui.templates.trainer.TEMPLATES_EMPTY
import com.fittrainer.ui.templates.trainer.TEMPLATES_NOT_LOADED
import com.fittrainer.ui.templates.trainer.TEMPLATES_TITLE
import com.fittrainer.ui.templates.trainer.templateDaysLine
import com.fittrainer.ui.templates.trainer.templateGoalLine
import com.fittrainer.ui.templates.trainer.templatesFor
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Plantillas del entrenador (E9), desde Más o desde la ficha de un alumno. */
@Composable
fun TemplatesScreen(onBack: () -> Unit, onOpen: (String) -> Unit, viewModel: TemplatesViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
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
                Text(state.studentName?.let(::templatesFor) ?: TEMPLATES_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        if (state.offline) item { OfflineIndicator("Sin conexión") }
        state.loadError?.let { item { RetryRow(it, viewModel::onRetry) } }
        when {
            !state.loaded -> Unit
            state.templates.isEmpty() && state.loadError != null -> Unit
            state.templates.isEmpty() -> item { InfoCard("Sin plantillas", if (state.everSynced) TEMPLATES_EMPTY else TEMPLATES_NOT_LOADED) }
            else -> items(state.templates, key = { it.id }) { TemplateRow(it) { onOpen(it.id) } }
        }
    }
}

@Composable
private fun TemplateRow(template: TemplateSummary, onClick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).clickable(onClick = onClick)
            .heightIn(min = Spacing.minTouchTarget).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(template.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        val goal = templateGoalLine(template)
        if (goal.isNotEmpty()) Text(goal, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
        Text(templateDaysLine(template), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    }
}
