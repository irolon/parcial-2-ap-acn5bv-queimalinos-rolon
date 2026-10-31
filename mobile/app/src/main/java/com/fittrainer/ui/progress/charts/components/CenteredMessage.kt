package com.fittrainer.ui.progress.charts.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.fittrainer.ui.progress.charts.ChartsTexts
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

@Composable
fun CenteredMessage(text: String) {
    Text(
        text,
        modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.lg),
        style = MaterialTheme.typography.bodyMedium,
        color = FtColors.TextSecondary,
        textAlign = TextAlign.Center,
    )
}

/** Período sin puntos: mensaje y "Ver todo". */
@Composable
fun EmptyPeriodMessage(text: String, onSeeAll: () -> Unit) {
    CenteredMessage(text)
    OutlinedButton(onClick = onSeeAll, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) {
        Text(ChartsTexts.SEE_ALL)
    }
}

/** Online, nunca bajado y el pedido terminó sin datos: mensaje y Reintentar dentro de la sección (sobrevive al banner). */
@Composable
fun LoadFailedMessage(onRetry: () -> Unit) {
    CenteredMessage(ChartsTexts.LOAD_FAILED)
    OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) {
        Text(ChartsTexts.RETRY)
    }
}

/** Primera bajada en curso (LOADING): spinner de la marca en lugar del área vacía. */
@Composable
fun ChartLoading() {
    Box(Modifier.fillMaxWidth().padding(vertical = Spacing.xl), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = FtColors.Brand)
    }
}
