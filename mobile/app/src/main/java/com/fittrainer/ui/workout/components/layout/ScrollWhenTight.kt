package com.fittrainer.ui.workout.components.layout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp

/**
 * Columna que no scrollea si todo entra y scrollea si no. [top] va arriba como una columna común; [fill]
 * recibe como alto mínimo lo que sobra del alto visible (así puede anclar cosas al fondo) y sin máximo:
 * si necesita más, la pantalla se puede bajar en vez de recortarlo.
 */
@Composable
fun ScrollWhenTight(
    gap: Dp,
    padding: Dp,
    top: @Composable ColumnScope.() -> Unit,
    fill: @Composable () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scroll = rememberScrollState()
    BoxWithConstraints(modifier) {
        val padPx = with(LocalDensity.current) { padding.roundToPx() }
        val viewport = (constraints.maxHeight - 2 * padPx).coerceAtLeast(0)
        Layout(
            content = {
                Column(verticalArrangement = Arrangement.spacedBy(gap), content = top)
                Box(propagateMinConstraints = true) { fill() }
            },
            modifier = Modifier.fillMaxWidth().verticalScroll(scroll).padding(padding),
        ) { measurables, constraints ->
            val gapPx = gap.roundToPx()
            val topP = measurables[0].measure(Constraints(maxWidth = constraints.maxWidth))
            val minFill = fillMinHeight(viewport, topP.height, gapPx)
            val fillP = measurables[1].measure(
                Constraints(minWidth = constraints.maxWidth, maxWidth = constraints.maxWidth, minHeight = minFill),
            )
            layout(constraints.maxWidth, topP.height + gapPx + fillP.height) {
                topP.placeRelative(0, 0)
                fillP.placeRelative(0, topP.height + gapPx)
            }
        }
    }
}
