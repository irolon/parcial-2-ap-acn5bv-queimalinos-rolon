package com.fittrainer.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

/** Tokens de color de la Guía Mobile (p.7). Un color semántico por significado. */
object FtColors {
    val Brand = Color(0xFF2952D9)
    val BrandText = Color(0xFF5E7DE2)
    val BrandPressed = Color(0xFF1B3AA8)

    val Background = Color(0xFF0B0D0C)
    val Surface = Color(0xFF111413)
    val Card = Color(0xFF181C1B)
    val Elevated = Color(0xFF232927)
    val Border = Color(0xFF2F3634)
    val Ink5 = Color(0xFF485150)
    val TextSecondary = Color(0xFF8C9593)
    val TextPrimary = Color(0xFFF5F2EC)

    val Green = Color(0xFF4AE290)
    val Coral = Color(0xFFFF5C3A)
    val Cyan = Color(0xFF36C6FF)
    val Amber = Color(0xFFFFB020)
}

internal val FtColorScheme = darkColorScheme(
    primary = FtColors.Brand,
    onPrimary = FtColors.TextPrimary,
    primaryContainer = FtColors.BrandPressed,
    onPrimaryContainer = FtColors.TextPrimary,
    secondary = FtColors.BrandText,
    onSecondary = FtColors.Background,
    secondaryContainer = FtColors.Elevated,
    onSecondaryContainer = FtColors.TextPrimary,
    tertiary = FtColors.Cyan,
    onTertiary = FtColors.Background,
    tertiaryContainer = FtColors.Elevated,
    onTertiaryContainer = FtColors.TextPrimary,
    background = FtColors.Background,
    onBackground = FtColors.TextPrimary,
    surface = FtColors.Surface,
    onSurface = FtColors.TextPrimary,
    surfaceVariant = FtColors.Card,
    onSurfaceVariant = FtColors.TextSecondary,
    surfaceContainerLowest = FtColors.Background,
    surfaceContainerLow = FtColors.Surface,
    surfaceContainer = FtColors.Card,
    surfaceContainerHigh = FtColors.Elevated,
    surfaceContainerHighest = FtColors.Elevated,
    surfaceBright = FtColors.Elevated,
    surfaceDim = FtColors.Background,
    surfaceTint = FtColors.Brand,
    inverseSurface = FtColors.TextPrimary,
    inverseOnSurface = FtColors.Background,
    inversePrimary = FtColors.BrandPressed,
    outline = FtColors.Border,
    outlineVariant = FtColors.Ink5,
    error = FtColors.Coral,
    onError = FtColors.Background,
    errorContainer = FtColors.Elevated,
    onErrorContainer = FtColors.Coral,
    scrim = Color(0xCC000000),
)
