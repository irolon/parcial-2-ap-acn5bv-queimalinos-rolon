package com.fittrainer.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/** Radios de la Guía Mobile (p.9). */
object FtRadius {
    val chip = 6.dp
    val control = 12.dp // botón e input
    val card = 14.dp
    val pill = 99.dp
}

internal val FtShapes = Shapes(
    extraSmall = RoundedCornerShape(FtRadius.chip),
    small = RoundedCornerShape(FtRadius.control),
    medium = RoundedCornerShape(FtRadius.card),
    large = RoundedCornerShape(FtRadius.card),
    extraLarge = RoundedCornerShape(28.dp), // diálogos y sheets; las pastillas usan FtRadius.pill
)
