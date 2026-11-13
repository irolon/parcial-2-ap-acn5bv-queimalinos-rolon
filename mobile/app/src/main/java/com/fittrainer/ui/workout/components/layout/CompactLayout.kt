package com.fittrainer.ui.workout.components.layout

/** Por debajo de este alto de ventana (dp) la sesión usa el modo compacto: números y espacios más chicos. */
const val COMPACT_HEIGHT_DP = 720

/** Alto de ventana, no tamaño físico: así también lo activa el zoom de pantalla grande (Galaxy S10, 11/11). */
fun isCompactHeight(screenHeightDp: Int): Boolean = screenHeightDp < COMPACT_HEIGHT_DP

/** Alto mínimo de la parte de abajo (px): lo que sobra del alto visible debajo de la parte de arriba. */
fun fillMinHeight(viewport: Int, top: Int, gap: Int): Int = (viewport - top - gap).coerceAtLeast(0)

/**
 * Alto de la parte de abajo cuando la pantalla se puede bajar (px): el alto visible que sobra, o lo justo para
 * que entren el botón principal y las acciones si eso es más (ahí aparece el scroll en vez de recortarlas).
 */
fun fillHeight(available: Int, cta: Int, bottom: Int, gap: Int): Int = maxOf(available, cta + gap + bottom)
