package com.fittrainer.ui.students.overview.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.overview.TrainerOverview
import com.fittrainer.ui.students.overview.HOME_DAY_LABEL
import com.fittrainer.ui.students.overview.dayTitle
import com.fittrainer.ui.students.overview.daySubtitle
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

private val OnBrandMuted = Color(0xFFCDD6FF)

/** Tarjeta azul del día: anillo "hechos/planificados", cuántos faltan y quién. Tocarla elige el filtro Hoy. */
@Composable
fun DayCard(o: TrainerOverview, onClick: () -> Unit) {
    val allDone = o.plannedToday > 0 && o.missingToday.isEmpty()
    Row(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.extraLarge)
            .background(Brush.linearGradient(listOf(FtColors.Brand, FtColors.BrandPressed)))
            .clickable(onClick = onClick).padding(Spacing.lg),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.lg),
    ) {
        ProgressRing(o.plannedDone, o.plannedToday)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(HOME_DAY_LABEL, style = MaterialTheme.typography.labelSmall, color = OnBrandMuted)
            Text(dayTitle(o), style = MaterialTheme.typography.titleLarge, color = if (allDone) FtColors.Green else Color.White)
            Text(daySubtitle(o), style = MaterialTheme.typography.bodySmall, color = OnBrandMuted, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

/** Anillo de progreso con "X/Y" adentro; sin nada planificado, vacío con "—". */
@Composable
private fun ProgressRing(done: Int, total: Int) {
    val fraction = if (total == 0) 0f else done.toFloat() / total
    Box(Modifier.size(76.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(76.dp)) {
            val stroke = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round)
            drawArc(Color.White.copy(alpha = 0.2f), 0f, 360f, false, style = stroke)
            if (fraction > 0f) drawArc(FtColors.Green, -90f, 360f * fraction, false, style = stroke)
        }
        Text(if (total == 0) "—" else "$done/$total", style = MaterialTheme.typography.titleMedium, color = Color.White)
    }
}
