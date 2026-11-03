package com.fittrainer.ui.components.bodymap

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.fittrainer.ui.theme.FtColors

private const val PART_STROKE = 3f
private const val OUTLINE_STROKE = 2f

/**
 * Cuerpo de frente y/o de espalda con las partes de [painted] en azul de marca.
 * Sin datos del dibujo reserva el lugar (un Spacer del mismo tamaño) y no pinta nada. [contentDescription] vacío = decorativo.
 */
@Composable
fun BodyMap(
    painted: Set<String>,
    views: List<BodyView>,
    contentDescription: String,
    modifier: Modifier = Modifier,
) {
    val body = rememberBodyMap()
    if (body == null) {
        // Mantiene el tamaño para que, al llegar el dibujo, nada de alrededor se corra.
        Spacer(modifier)
        return
    }
    val semanticsModifier = if (contentDescription.isEmpty()) {
        modifier
    } else {
        modifier.semantics { this.contentDescription = contentDescription }
    }
    Row(semanticsModifier) {
        views.forEach { v ->
            val parsed = body.view(v)
            Canvas(Modifier.weight(1f).fillMaxHeight()) { drawBody(parsed, painted) }
        }
    }
}

private fun partColor(slug: String, painted: Set<String>): Color = when {
    slug in painted -> FtColors.Brand
    slug in NEUTRAL_PARTS -> FtColors.BodyNeutral
    else -> FtColors.BodyMuscle
}

private fun DrawScope.drawBody(view: ParsedView, painted: Set<String>) {
    // Escala uniforme (mismo factor en los dos ejes), centrada en el espacio dado.
    val scale = minOf(size.width / view.width, size.height / view.height)
    val dx = (size.width - view.width * scale) / 2f
    val dy = (size.height - view.height * scale) / 2f
    withTransform({
        translate(dx, dy)
        scale(scale, scale, pivot = Offset.Zero)
        translate(-view.viewBox[0], -view.viewBox[1])
    }) {
        view.parts.forEach { part ->
            drawPath(part.path, partColor(part.slug, painted))
            drawPath(part.path, FtColors.Background, style = Stroke(width = PART_STROKE))
        }
        drawPath(view.outline, FtColors.BodyOutline, style = Stroke(width = OUTLINE_STROKE))
    }
}
