package com.fittrainer.ui.workout.components.muscle

import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.unit.Constraints
import com.fittrainer.ui.workout.components.layout.fillHeight

private const val CARD = "card"
private const val CTA = "cta"
private const val BOTTOM = "bottom"

/**
 * Reparte el alto que sobra debajo del panel de carga: la tarjeta del músculo (si hay y entra), el botón
 * principal pegado abajo de ella y las acciones de abajo ancladas al fondo. Mide primero el botón y las
 * acciones y después la tarjeta, así la tarjeta solo aparece si entra con el alto REAL (fuente, banners),
 * y nunca empuja al botón ni a las acciones. [card] en null = el grupo no pinta nada.
 *
 * Con alto acotado ocupa ese alto. Sin máximo (dentro de [com.fittrainer.ui.workout.components.layout.ScrollWhenTight])
 * el alto visible es el mínimo: si el botón y las acciones no entran ahí, crece lo justo y la pantalla se baja en vez
 * de recortarlas (Galaxy S10 con zoom grande, 11/11). La tarjeta solo aparece si entra en el alto visible.
 */
@Composable
fun CardIfFitsLayout(
    gap: Int,
    card: (@Composable () -> Unit)?,
    cta: @Composable () -> Unit,
    bottom: @Composable () -> Unit,
    modifier: Modifier = Modifier,
) {
    Layout(
        content = {
            if (card != null) Box(Modifier.layoutId(CARD)) { card() }
            Box(Modifier.layoutId(CTA)) { cta() }
            Box(Modifier.layoutId(BOTTOM)) { bottom() }
        },
        modifier = modifier,
    ) { measurables, constraints ->
        val loose = Constraints(maxWidth = constraints.maxWidth, maxHeight = Constraints.Infinity)
        val ctaP = measurables.first { it.layoutId == CTA }.measure(loose)
        val bottomP = measurables.first { it.layoutId == BOTTOM }.measure(loose)
        val cardP = measurables.firstOrNull { it.layoutId == CARD }?.measure(loose)
        val bounded = constraints.hasBoundedHeight
        val available = if (bounded) constraints.maxHeight else constraints.minHeight
        val showCard = cardP != null && cardFits(available, cardP.height, ctaP.height, bottomP.height, gap)
        val height = if (bounded) available else fillHeight(available, ctaP.height, bottomP.height, gap)
        layout(constraints.maxWidth, height) {
            var y = 0
            if (showCard && cardP != null) {
                cardP.place(0, 0)
                y = cardP.height + gap
            }
            ctaP.place(0, y)
            bottomP.place(0, bottomActionsY(height, y + ctaP.height, gap, bottomP.height))
        }
    }
}
