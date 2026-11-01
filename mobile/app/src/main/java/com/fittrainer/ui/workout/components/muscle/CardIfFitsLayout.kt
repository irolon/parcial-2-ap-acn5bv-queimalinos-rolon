package com.fittrainer.ui.workout.components.muscle

import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.unit.Constraints
import com.fittrainer.ui.workout.bottomActionsY
import com.fittrainer.ui.workout.cardFits

private const val CARD = "card"
private const val CTA = "cta"
private const val BOTTOM = "bottom"

/**
 * Reparte el alto que sobra debajo del panel de carga: la tarjeta del músculo (si hay y entra), el botón
 * principal pegado abajo de ella y las acciones de abajo ancladas al fondo. Mide primero el botón y las
 * acciones y después la tarjeta, así la tarjeta solo aparece si entra con el alto REAL (fuente, banners),
 * y nunca empuja al botón ni a las acciones. Si ni el botón y las acciones entran (pantalla muy chica), las
 * acciones quedan debajo del botón y se recortan, sin superponerse. [card] en null = el grupo no pinta nada.
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
        val height = constraints.maxHeight
        val showCard = cardP != null && cardFits(height, cardP.height, ctaP.height, bottomP.height, gap)
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
