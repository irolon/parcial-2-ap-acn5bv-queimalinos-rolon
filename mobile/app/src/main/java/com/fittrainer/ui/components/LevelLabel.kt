package com.fittrainer.ui.components

/** Etiqueta del nivel del backend; sin nivel devuelve null (no se muestra nada). Un valor desconocido se devuelve tal cual. */
fun levelLabel(level: String?): String? = when (level) {
    null -> null
    "beginner" -> "Principiante"
    "intermediate" -> "Intermedio"
    "advanced" -> "Avanzado"
    else -> level
}

/** Etiqueta para los selectores: "Sin definir" solo aparece como opción. */
fun levelOptionLabel(level: String?): String = levelLabel(level) ?: "Sin definir"
