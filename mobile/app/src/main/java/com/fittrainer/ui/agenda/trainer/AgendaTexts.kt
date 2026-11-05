package com.fittrainer.ui.agenda.trainer

import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.agenda.AvailabilitySlot
import com.fittrainer.data.agenda.weekEnd
import com.fittrainer.data.students.ARGENTINA
import java.time.Instant
import java.time.LocalDate
import java.time.ZonedDateTime

const val AGENDA_TITLE = "Agenda"
const val AGENDA_TODAY = "Hoy"
const val SHOW_CANCELLED = "Mostrar cancelados"
const val NO_APPOINTMENTS = "Sin turnos"
const val NO_AVAILABILITY = "Sin disponibilidad"
const val AGENDA_OFFLINE = "Sin conexión · mostrando lo guardado"
const val AGENDA_LOAD_FAILED = "No pudimos bajar la agenda"
const val AGENDA_REFRESH_FAILED = "No pudimos actualizar la agenda. Mostrando lo guardado"
const val AGENDA_NOT_LOADED = "Todavía no se bajó esta semana. Conectate para verla."
const val AGENDA_RETRY = "Reintentar"
const val APPOINTMENT_TITLE = "Turno"
const val APPOINTMENT_PAST = "Este turno ya pasó"
const val CONFIRM_APPOINTMENT = "Confirmar"
const val CANCEL_APPOINTMENT = "Cancelar turno"
const val CANCEL_BACK = "Volver"
const val CANCEL_YES = "Sí, cancelar turno"
const val APPOINTMENT_GONE = "Este turno ya no existe"
const val ACTION_OFFLINE = "Sin conexión: confirmá o cancelá cuando vuelva la red"
const val ACTION_FAILED = "No pudimos guardar el cambio. Probá de nuevo."

/** Los turnos duran 60 min (checks de la base). */
private const val APPOINTMENT_MINUTES = 60L

private val WEEKDAYS_SHORT = listOf("LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM")
private val WEEKDAYS_TITLE = listOf("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom")
private val MONTHS_SHORT = listOf("ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC")

private fun pad(n: Int) = n.toString().padStart(2, '0')

private fun local(at: Instant): ZonedDateTime = at.atZone(ARGENTINA)

private fun clock(t: ZonedDateTime) = "${pad(t.hour)}:${pad(t.minute)}"

private fun dayMonth(t: ZonedDateTime) = "${pad(t.dayOfMonth)}/${pad(t.monthValue)}"

/** "SEMANA DEL 2 AL 8 NOV"; si cruza de mes, "SEMANA DEL 27 OCT AL 2 NOV" (weekTitle de la web). */
fun weekTitle(weekStart: LocalDate): String {
    val end = weekEnd(weekStart)
    val endText = "${end.dayOfMonth} ${MONTHS_SHORT[end.monthValue - 1]}"
    val startText = if (weekStart.month == end.month) "${weekStart.dayOfMonth}" else "${weekStart.dayOfMonth} ${MONTHS_SHORT[weekStart.monthValue - 1]}"
    return "SEMANA DEL $startText AL $endText"
}

/** "LUN 02". */
fun dayLabel(day: LocalDate): String = "${WEEKDAYS_SHORT[day.dayOfWeek.value - 1]} ${pad(day.dayOfMonth)}"

/** "18:00", en hora de Argentina. */
fun hourLabel(at: Instant): String = clock(local(at))

/** "Vie 06/11 · 18:00–19:00". */
fun timeRangeLabel(at: Instant): String {
    val start = local(at)
    return "${WEEKDAYS_TITLE[start.dayOfWeek.value - 1]} ${dayMonth(start)} · ${clock(start)}–${clock(start.plusMinutes(APPOINTMENT_MINUTES))}"
}

/** "vie 06/11 a las 18:00". */
fun shortDayHourLabel(at: Instant): String {
    val t = local(at)
    return "${WEEKDAYS_TITLE[t.dayOfWeek.value - 1].lowercase()} ${dayMonth(t)} a las ${clock(t)}"
}

/** "¿Cancelar el turno de Lucía del vie 06/11 a las 18:00? Le avisamos." (con el primer nombre, como la web). */
fun cancelQuestion(appointment: Appointment): String {
    val first = appointment.studentName.trim().split(Regex("\\s+")).first()
    return "¿Cancelar el turno de $first del ${shortDayHourLabel(appointment.at)}? Le avisamos."
}

/** Las franjas de un día: "09–13 · 17–21", o "Sin disponibilidad". */
fun availabilityLabel(slots: List<AvailabilitySlot>): String =
    if (slots.isEmpty()) NO_AVAILABILITY
    else slots.sortedBy { it.startHour }.joinToString(" · ") { "${pad(it.startHour)}–${pad(it.endHour)}" }

fun statusLabel(status: AppointmentStatus): String = when (status) {
    AppointmentStatus.PENDING -> "PENDIENTE"
    AppointmentStatus.CONFIRMED -> "CONFIRMADO"
    AppointmentStatus.CANCELLED -> "CANCELADO"
}
