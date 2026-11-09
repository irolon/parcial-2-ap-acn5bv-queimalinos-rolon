package com.fittrainer.ui.agenda

import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.students.ARGENTINA
import java.time.Instant
import java.time.LocalDate
import java.time.ZonedDateTime

// Textos y etiquetas de los turnos que comparten la agenda del entrenador (E13) y los turnos del alumno (tarjeta 16).
// Todas las fechas van en hora de Argentina.

const val AGENDA_RETRY = "Reintentar"
const val APPOINTMENT_PAST = "Este turno ya pasó"
const val CANCEL_APPOINTMENT = "Cancelar turno"
const val CANCEL_BACK = "Volver"
const val CANCEL_YES = "Sí, cancelar turno"
const val APPOINTMENT_GONE = "Este turno ya no existe"
const val ACTION_FAILED = "No pudimos guardar el cambio. Probá de nuevo."

/** Los turnos duran 60 min (checks de la base). */
private const val APPOINTMENT_MINUTES = 60L

private val WEEKDAYS_SHORT = listOf("LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM")
private val WEEKDAYS_TITLE = listOf("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom")

/** 9 → "09". */
fun twoDigits(n: Int): String = n.toString().padStart(2, '0')

private fun local(at: Instant): ZonedDateTime = at.atZone(ARGENTINA)

private fun clock(t: ZonedDateTime) = "${twoDigits(t.hour)}:${twoDigits(t.minute)}"

private fun dayMonth(day: Int, month: Int) = "${twoDigits(day)}/${twoDigits(month)}"

private fun weekdayTitle(t: ZonedDateTime) = WEEKDAYS_TITLE[t.dayOfWeek.value - 1]

/** "LUN 02". */
fun dayLabel(day: LocalDate): String = "${WEEKDAYS_SHORT[day.dayOfWeek.value - 1]} ${twoDigits(day.dayOfMonth)}"

/** "VIE 06/11": el encabezado de un día de horarios libres. */
fun dayMonthLabel(day: LocalDate): String = "${WEEKDAYS_SHORT[day.dayOfWeek.value - 1]} ${dayMonth(day.dayOfMonth, day.monthValue)}"

/** "18:00". */
fun hourLabel(at: Instant): String = clock(local(at))

/** "Vie 06/11 · 18:00". */
fun dayHourLabel(at: Instant): String {
    val t = local(at)
    return "${weekdayTitle(t)} ${dayMonth(t.dayOfMonth, t.monthValue)} · ${clock(t)}"
}

/** "Vie 06/11 · 18:00–19:00". */
fun timeRangeLabel(at: Instant): String =
    "${dayHourLabel(at)}–${clock(local(at).plusMinutes(APPOINTMENT_MINUTES))}"

/** "vie 06/11 a las 18:00". */
fun shortDayHourLabel(at: Instant): String {
    val t = local(at)
    return "${weekdayTitle(t).lowercase()} ${dayMonth(t.dayOfMonth, t.monthValue)} a las ${clock(t)}"
}

fun statusLabel(status: AppointmentStatus): String = when (status) {
    AppointmentStatus.PENDING -> "PENDIENTE"
    AppointmentStatus.CONFIRMED -> "CONFIRMADO"
    AppointmentStatus.CANCELLED -> "CANCELADO"
}
