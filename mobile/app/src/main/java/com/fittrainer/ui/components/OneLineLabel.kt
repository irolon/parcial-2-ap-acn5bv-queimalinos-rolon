package com.fittrainer.ui.components

import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.LocalTextStyle
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.isSpecified
import androidx.compose.ui.unit.sp

/** Letra mínima de un botón antes de dejar de achicar: por debajo de esto ya no se lee bien en el gimnasio. */
val MIN_LABEL_SIZE = 10.sp

/**
 * Texto de botón siempre en una línea: si no entra con la letra del botón, achica la letra en vez de partir la
 * palabra ("P/a/u/s/ar" en el Galaxy S10 con zoom grande, 11/11). Toma el estilo y el color del botón.
 */
@Composable
fun OneLineLabel(text: String, modifier: Modifier = Modifier, minSize: TextUnit = MIN_LABEL_SIZE) {
    val style = LocalTextStyle.current
    val max = style.fontSize.takeIf { it.isSpecified } ?: 14.sp
    BasicText(
        text,
        modifier = modifier,
        style = style.merge(color = LocalContentColor.current, textAlign = TextAlign.Center),
        maxLines = 1,
        // Sin cortar la palabra en dos renglones: así autoSize ve que no entra y achica (con maxLines solo, no lo veía).
        softWrap = false,
        autoSize = TextAutoSize.StepBased(minFontSize = minSize, maxFontSize = max),
    )
}
