package com.fittrainer.ui.gamification

import com.fittrainer.data.gamification.BUSINESS_ZONE
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.roundToLong

const val GAMIFICATION_REFRESH_FAILED = "No pudimos actualizar tus logros. Mostrando lo guardado"

private val MONTHS = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")

/** "12 oct", con el día de Buenos Aires. */
fun shortDate(instant: Instant): String = instant.atZone(BUSINESS_ZONE).toLocalDate().let { "${it.dayOfMonth} ${MONTHS[it.monthValue - 1]}" }

/** Enteros con punto de miles ("10.000"); con decimales, uno y con coma ("80,5"). Sin Locale. */
fun amount(value: Double): String {
    if (abs(value - value.roundToLong()) < 0.05) return value.roundToLong().toString().reversed().chunked(3).joinToString(".").reversed()
    return ((value * 10).roundToLong() / 10.0).toString().replace('.', ',')
}

fun challengeProgressLabel(goalType: String?, current: Double, goal: Double): String = when (goalType) {
    "sessions_count" -> "${amount(current)} de ${amount(goal)} sesiones"
    "streak" -> "${amount(current)} de ${amount(goal)} días de racha"
    "volume" -> "${amount(current)} de ${amount(goal)} kg de volumen"
    "weight_target" -> "Peso actual ${amount(current)} kg · meta ${amount(goal)} kg"
    else -> "${amount(current)} de ${amount(goal)}"
}

/** "1 día" / "N días". */
fun daysLabel(n: Int): String = if (n == 1) "1 día" else "$n días"

/** Días que quedan hasta el día (Buenos Aires) en que vence. */
fun daysLeftLabel(endsOn: LocalDate, today: LocalDate): String = when (val days = ChronoUnit.DAYS.between(today, endsOn)) {
    in Long.MIN_VALUE..0L -> "Termina hoy"
    1L -> "Queda 1 día"
    else -> "Quedan $days días"
}
