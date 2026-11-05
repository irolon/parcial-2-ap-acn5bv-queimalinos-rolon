package com.fittrainer.ui.agenda.trainer

import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AvailabilitySlot
import com.fittrainer.data.agenda.weekEnd
import com.fittrainer.ui.agenda.shortDayHourLabel
import com.fittrainer.ui.agenda.twoDigits
import java.time.LocalDate

// Los textos que comparte con los turnos del alumno (fechas, estados, cancelar) están en ui/agenda/AgendaLabels.kt.

const val AGENDA_TITLE = "Agenda"
const val AGENDA_TODAY = "Hoy"
const val SHOW_CANCELLED = "Mostrar cancelados"
const val NO_APPOINTMENTS = "Sin turnos"
const val NO_AVAILABILITY = "Sin disponibilidad"
const val AGENDA_OFFLINE = "Sin conexión · mostrando lo guardado"
const val AGENDA_LOAD_FAILED = "No pudimos bajar la agenda"
const val AGENDA_REFRESH_FAILED = "No pudimos actualizar la agenda. Mostrando lo guardado"
const val AGENDA_NOT_LOADED = "Todavía no se bajó esta semana. Conectate para verla."
const val APPOINTMENT_TITLE = "Turno"
const val CONFIRM_APPOINTMENT = "Confirmar"
const val ACTION_OFFLINE = "Sin conexión: confirmá o cancelá cuando vuelva la red"

private val MONTHS_SHORT = listOf("ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC")

/** "SEMANA DEL 2 AL 8 NOV"; si cruza de mes, "SEMANA DEL 27 OCT AL 2 NOV" (weekTitle de la web). */
fun weekTitle(weekStart: LocalDate): String {
    val end = weekEnd(weekStart)
    val endText = "${end.dayOfMonth} ${MONTHS_SHORT[end.monthValue - 1]}"
    val startText = if (weekStart.month == end.month) "${weekStart.dayOfMonth}" else "${weekStart.dayOfMonth} ${MONTHS_SHORT[weekStart.monthValue - 1]}"
    return "SEMANA DEL $startText AL $endText"
}

/** "¿Cancelar el turno de Lucía del vie 06/11 a las 18:00? Le avisamos." (con el primer nombre, como la web). */
fun cancelQuestion(appointment: Appointment): String {
    val first = appointment.studentName.trim().split(Regex("\\s+")).first()
    return "¿Cancelar el turno de $first del ${shortDayHourLabel(appointment.at)}? Le avisamos."
}

/** Las franjas de un día: "09–13 · 17–21", o "Sin disponibilidad". */
fun availabilityLabel(slots: List<AvailabilitySlot>): String =
    if (slots.isEmpty()) NO_AVAILABILITY
    else slots.sortedBy { it.startHour }.joinToString(" · ") { "${twoDigits(it.startHour)}–${twoDigits(it.endHour)}" }
