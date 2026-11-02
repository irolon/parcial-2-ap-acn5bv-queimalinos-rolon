package com.fittrainer.ui.students.detail.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.detail.StudentDetail
import com.fittrainer.ui.invitations.levelLabel
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.students.detail.EMPTY_VALUE
import com.fittrainer.ui.students.detail.NO_METRICS
import com.fittrainer.ui.students.detail.NO_ROUTINE
import com.fittrainer.ui.students.detail.dateLabel
import com.fittrainer.ui.students.detail.daysLabel
import com.fittrainer.ui.students.detail.metricValues
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Tarjeta con título en mayúscula mono, como el resto de la app. Las secciones de E4-E6 la reusan. */
@Composable
fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(title, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        content()
    }
}

@Composable
fun RoutineCard(detail: StudentDetail) = SectionCard("RUTINA ACTIVA") {
    val routine = detail.activeRoutine
    Text(routine?.name ?: NO_ROUTINE, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
    if (routine != null && routine.days.isNotEmpty()) {
        Text(daysLabel(routine.days), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    }
}

/** onHistory/onNew en null: sin acciones (E6 las suma). canWrite: "+ Nueva medida" pide red. */
@Composable
fun LatestMetricsCard(
    detail: StudentDetail,
    onHistory: (() -> Unit)? = null,
    onNew: (() -> Unit)? = null,
    canWrite: Boolean = true,
) = SectionCard("ÚLTIMA MEDICIÓN") {
    val metrics = detail.latestMetrics
    if (metrics == null) {
        Text(NO_METRICS, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
    } else {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.lg)) {
            metricValues(metrics).forEach { (label, value) ->
                Column {
                    Text(value, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
                    Text(label, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
                }
            }
        }
        Text(dateLabel(metrics.recordedAt), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    }
    if (onHistory != null || onNew != null) {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            onHistory?.let { TextButton(onClick = it, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Ver historial") } }
            onNew?.let {
                TextButton(onClick = it, enabled = canWrite, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("+ Nueva medida") }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DataCard(detail: StudentDetail) = SectionCard("DATOS") {
    DataRow("Objetivo", detail.goal?.let(::goalLabel) ?: EMPTY_VALUE)
    DataRow("Nivel", detail.level?.let(::levelLabel) ?: EMPTY_VALUE)
    DataRow("Nacimiento", dateLabel(detail.birthDate))
    DataRow("Email", detail.email)
    Text("Equipamiento", style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    if (detail.gymEquipment.isEmpty()) {
        Text(EMPTY_VALUE, color = FtColors.TextPrimary)
    } else {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.xs), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            detail.gymEquipment.forEach {
                Text(
                    it,
                    Modifier.background(FtColors.Elevated, MaterialTheme.shapes.small).padding(horizontal = Spacing.sm, vertical = 2.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = FtColors.TextPrimary,
                )
            }
        }
    }
    Text("Lesiones", style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    Text(detail.injuries ?: EMPTY_VALUE, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
}

@Composable
private fun DataRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth()) {
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
    }
}
