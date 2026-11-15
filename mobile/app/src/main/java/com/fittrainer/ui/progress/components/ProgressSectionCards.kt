package com.fittrainer.ui.progress.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.progress.chartsCardSubtitle
import com.fittrainer.ui.progress.lastSession
import com.fittrainer.ui.progress.lastSessionTitle
import com.fittrainer.ui.progress.volumeTrend
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.HistoryUiState
import com.fittrainer.ui.workout.history.historyLine
import com.fittrainer.ui.workout.history.unreadBadgeDescription
import java.time.ZoneId

/** Tarjeta de Historial en Progreso: la última sesión y los comentarios sin leer. Toda la tarjeta abre el historial. */
@Composable
fun HistoryPreviewCard(state: HistoryUiState, onOpen: () -> Unit) {
    val zone = remember { ZoneId.systemDefault() }
    val last = lastSession(state.items)
    val title = last?.let { lastSessionTitle(it, zone) }
    val detail = last?.let { historyLine(it.durationMin, it.sets, it.volumeKg) }
    val unread = state.unreadComments.takeIf { it > 0 }?.let(::unreadBadgeDescription)
    val summary = listOfNotNull(title?.let { "Última sesión: $it" }, detail, unread).ifEmpty { listOf("Todavía no registraste sesiones") }
    SectionCard("Historial", "Ver todo ›", summary.joinToString(". "), onOpen) {
        if (last == null) {
            Text("Todavía no registraste sesiones", style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        } else {
            Text("Última sesión", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            Text(title.orEmpty(), style = MaterialTheme.typography.bodyLarge, color = FtColors.TextPrimary)
            Text(detail.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        }
        unread?.let { Text("💬 $it", style = MaterialTheme.typography.labelLarge, color = FtColors.BrandText) }
    }
}

/** Tarjeta de Gráficos en Progreso: una curva chica del volumen de las últimas sesiones. Toda la tarjeta abre los gráficos. */
@Composable
fun ChartsPreviewCard(state: HistoryUiState, onOpen: () -> Unit) {
    val trend = volumeTrend(state.items)
    val subtitle = chartsCardSubtitle(trend)
    SectionCard("Gráficos", "Ver ›", subtitle, onOpen) {
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        if (trend.isNotEmpty()) Sparkline(trend, Modifier.fillMaxWidth().height(40.dp))
    }
}

@Composable
private fun SectionCard(title: String, action: String, description: String, onOpen: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(FtColors.Card)
            .clickable(role = Role.Button, onClick = onOpen)
            .clearAndSetSemantics {
                role = Role.Button
                contentDescription = "$title. $description. Abrir $title"
            }
            .heightIn(min = Spacing.minTouchTarget).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Row(Modifier.padding(bottom = Spacing.xs), verticalAlignment = Alignment.CenterVertically) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary, modifier = Modifier.weight(1f))
            Text(action, style = MaterialTheme.typography.labelLarge, color = FtColors.BrandText)
        }
        content()
    }
}

/** Curva sin ejes: solo muestra la tendencia. El detalle con ejes está en Gráficos. */
@Composable
private fun Sparkline(values: List<Double>, modifier: Modifier) {
    Canvas(modifier.padding(vertical = 4.dp)) {
        val min = values.min()
        val span = values.max() - min
        val step = size.width / (values.size - 1)
        // Todas iguales: línea al medio en vez de pegada abajo.
        val points = values.mapIndexed { i, v ->
            Offset(i * step, if (span > 0) size.height - ((v - min) / span * size.height).toFloat() else size.height / 2)
        }
        val path = Path().apply { moveTo(points[0].x, points[0].y); points.drop(1).forEach { lineTo(it.x, it.y) } }
        drawPath(path, FtColors.Brand, style = Stroke(width = 2.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        drawCircle(FtColors.Brand, radius = 3.5.dp.toPx(), center = points.last())
    }
}
