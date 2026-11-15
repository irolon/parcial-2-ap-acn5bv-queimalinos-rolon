package com.fittrainer.ui.components

import com.fittrainer.data.invitation.invite.WEEKLY_FREQUENCY_RANGE

/** Días por semana que el alumno quiere entrenar (#123), como texto para los selectores ("1" a "7"). */
val FREQUENCY_OPTIONS: List<String> = WEEKLY_FREQUENCY_RANGE.map { it.toString() }

private fun days(n: Int) = if (n == 1) "1 día" else "$n días"

/** "4 días / semana" para el selector, o "Sin definir". */
fun frequencyOptionLabel(value: String?): String =
    value?.toIntOrNull()?.takeIf { it in WEEKLY_FREQUENCY_RANGE }?.let { "${days(it)} / semana" } ?: "Sin definir"

/** "4 días/semana" para la cabecera de la ficha, como la web; null si no hay frecuencia válida. */
fun frequencyLine(value: Int?): String? = value?.takeIf { it in WEEKLY_FREQUENCY_RANGE }?.let { "${days(it)}/semana" }
