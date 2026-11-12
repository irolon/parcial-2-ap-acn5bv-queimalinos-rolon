package com.fittrainer.ui.workout.components.rest

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrainer.ui.components.OneLineLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.formatClock

/** Botones de ±15″: chicos, pero con un ancho mínimo para que no queden como píldoras angostas. */
private val ADJUST_MIN_WIDTH = 96.dp

/**
 * Mockup p.14: lo que se hizo, anillo con la cuenta, ±15 / pausa / saltar y la próxima serie. [compact] (pantalla
 * baja) achica el anillo y la cuenta.
 */
@Composable
fun RestTimer(
    doneLine: String?,
    remainingMs: Long,
    totalSeconds: Int,
    paused: Boolean,
    nextLabel: String,
    nextLoad: String,
    onAdjust: (Int) -> Unit,
    onTogglePause: () -> Unit,
    onSkip: () -> Unit,
    compact: Boolean = false,
) {
    Column(
        Modifier.fillMaxSize().padding(Spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(if (compact) Spacing.lg else Spacing.xl, Alignment.CenterVertically),
    ) {
        doneLine?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary) }
        Text("DESCANSO", style = MaterialTheme.typography.labelMedium, color = FtColors.BrandText)
        Box(Modifier.size(if (compact) 200.dp else 240.dp), contentAlignment = Alignment.Center) {
            val progress = if (totalSeconds == 0) 0f else (remainingMs / (totalSeconds * 1_000f)).coerceIn(0f, 1f)
            Canvas(Modifier.fillMaxSize()) {
                val stroke = Stroke(width = 10.dp.toPx(), cap = StrokeCap.Round)
                drawArc(FtColors.Elevated, 0f, 360f, useCenter = false, style = stroke)
                drawArc(FtColors.Brand, -90f, 360f * progress, useCenter = false, style = stroke)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    formatClock(remainingMs),
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontSize = if (compact) 60.sp else 72.sp,
                        lineHeight = if (compact) 64.sp else 76.sp,
                    ),
                    color = FtColors.TextPrimary,
                )
                Text("DE ${formatClock(totalSeconds * 1_000L)}", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            }
        }
        // Dos filas (Igna, 11/11): en una sola, con zoom grande, "Pausar" se partía letra por letra.
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm, Alignment.CenterHorizontally)) {
                TimerButton("−15″", Modifier.widthIn(min = ADJUST_MIN_WIDTH)) { onAdjust(-15) }
                TimerButton("+15″", Modifier.widthIn(min = ADJUST_MIN_WIDTH)) { onAdjust(15) }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                TimerButton(if (paused) "Seguir" else "Pausar", Modifier.weight(1f), onTogglePause)
                TimerButton("Saltar", Modifier.weight(1f), onSkip)
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(nextLabel, style = MaterialTheme.typography.labelSmall, color = FtColors.BrandText)
            Text(nextLoad, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
        }
    }
}

@Composable
private fun TimerButton(text: String, modifier: Modifier, onClick: () -> Unit) {
    FilledTonalButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = Spacing.minTouchTarget),
        contentPadding = PaddingValues(horizontal = Spacing.md),
    ) { OneLineLabel(text) }
}
