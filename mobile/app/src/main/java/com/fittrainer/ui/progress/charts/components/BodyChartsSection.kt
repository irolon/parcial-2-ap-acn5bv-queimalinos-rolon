package com.fittrainer.ui.progress.charts.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartRange
import com.fittrainer.ui.progress.charts.ChartsContent
import com.fittrainer.ui.progress.charts.ChartsEmptyState
import com.fittrainer.ui.progress.charts.ChartsTexts
import com.fittrainer.ui.progress.charts.ChartsUiState
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Gráficos → Medidas (spec §3.3). El color de las medidas nunca es "bueno/malo": siempre gris. */
@Composable
fun BodyChartsSection(
    state: ChartsUiState,
    onField: (BodyField) -> Unit,
    onRange: (ChartRange) -> Unit,
    onRetry: () -> Unit,
) {
    val content = ChartsEmptyState.body(state)
    when (content) {
        ChartsContent.NEVER_LOADED -> return CenteredMessage(ChartsTexts.NEVER_LOADED)
        ChartsContent.NO_BODY -> return CenteredMessage(ChartsTexts.NO_BODY)
        ChartsContent.LOADING -> return ChartLoading()
        ChartsContent.LOAD_FAILED -> return LoadFailedMessage(onRetry)
        else -> Unit
    }
    val unit = state.bodyField?.let(ChartsTexts::fieldUnit).orEmpty()
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        ChartChips(state.bodyFields, state.bodyField, ChartsTexts::fieldLabel, onField)
        ChartChips(ChartRange.entries, state.range, ChartsTexts::rangeLabel, onRange)
        if (content == ChartsContent.EMPTY_PERIOD) {
            EmptyPeriodMessage(ChartsTexts.EMPTY_BODY_PERIOD) { onRange(ChartRange.ALL) }
            return@Column
        }
        LineChart(state.bodySeries, null, FtColors.Brand)
        ChartStats(
            firstLabel = "Última",
            firstValue = state.bodyLast?.let { ChartsTexts.formatValue(it.value, unit) } ?: "—",
            firstDetail = state.bodyLast?.let { ChartsTexts.formatShortDate(it.date) },
            deltaText = state.bodyDelta?.let { ChartsTexts.formatDelta(it, unit) },
            deltaColor = FtColors.TextSecondary,
            deltaDetail = state.bodyDelta?.let { state.bodySeries.firstOrNull()?.date?.let(ChartsTexts::formatSince) },
        )
    }
}
