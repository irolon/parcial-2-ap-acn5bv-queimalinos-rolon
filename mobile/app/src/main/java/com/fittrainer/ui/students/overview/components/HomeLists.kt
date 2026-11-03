package com.fittrainer.ui.students.overview.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.overview.FeedbackItem
import com.fittrainer.data.students.overview.RiskItem
import com.fittrainer.data.students.overview.StudentItem
import com.fittrainer.data.students.overview.StudentStatus
import com.fittrainer.data.students.overview.TodayItem
import com.fittrainer.ui.students.components.StudentAvatar
import com.fittrainer.ui.students.initials
import com.fittrainer.ui.students.overview.feedbackLine
import com.fittrainer.ui.students.overview.pctLabel
import com.fittrainer.ui.students.overview.riskLine
import com.fittrainer.ui.students.overview.studentLine
import com.fittrainer.ui.students.overview.todayLine
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant

/** Filtro Hoy: "pendiente" (ámbar) o "hecho" (verde). */
@Composable
fun TodayRow(item: TodayItem, onClick: () -> Unit) {
    HomeRow(item.name, todayLine(item), false, onClick) {
        if (item.done) Pill("hecho", FtColors.Green) else Pill("pendiente", FtColors.Amber)
    }
}

/** Filtro Riesgo: días sin entrenar y la píldora coral. */
@Composable
fun RiskRow(item: RiskItem, onClick: () -> Unit) {
    HomeRow(item.name, riskLine(item), true, onClick) { Pill("riesgo", FtColors.Coral) }
}

/** Filtro Feedback: la sesión sin comentar ("Push · RPE 8 · ayer"). */
@Composable
fun FeedbackRow(item: FeedbackItem, now: Instant, onClick: () -> Unit) {
    HomeRow(item.name, feedbackLine(item, now), false, onClick) { Pill("comentar", FtColors.BrandText) }
}

/** Filtro Activos: estado y adherencia de 7 días a la derecha. */
@Composable
fun StudentRow(item: StudentItem, onClick: () -> Unit) {
    HomeRow(item.name, studentLine(item), item.status == StudentStatus.INACTIVE, onClick) {
        Text(
            pctLabel(item.adherencePct),
            style = if (item.adherencePct != null) MaterialTheme.typography.titleSmall else MaterialTheme.typography.labelSmall,
            color = if (item.adherencePct != null) FtColors.TextPrimary else FtColors.TextSecondary,
        )
    }
}

@Composable
private fun HomeRow(name: String, line: String, risk: Boolean, onClick: () -> Unit, trailing: @Composable () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clip(MaterialTheme.shapes.large)
            .background(FtColors.Card).clickable(onClick = onClick).padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        StudentAvatar(initials(name), atRisk = risk, size = 40.dp)
        Column(Modifier.weight(1f)) {
            Text(name, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(line, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        trailing()
    }
}

@Composable
private fun Pill(text: String, color: Color) {
    Text(
        text,
        Modifier.background(color.copy(alpha = 0.16f), MaterialTheme.shapes.small).padding(horizontal = Spacing.sm, vertical = 2.dp),
        style = MaterialTheme.typography.labelSmall,
        color = color,
    )
}
