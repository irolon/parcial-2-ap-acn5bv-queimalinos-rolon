package com.fittrainer.ui.agenda.student

import com.fittrainer.ui.agenda.shortDayHourLabel
import java.time.Instant

// Textos de los turnos del alumno (tarjeta 16). Las fechas, los estados y cancelar están en ui/agenda/AgendaLabels.kt.

const val MY_APPOINTMENTS_TITLE = "Mis turnos"
const val MY_APPOINTMENTS_EMPTY = "No tenés turnos. Pedí uno con tu entrenador."
const val MY_APPOINTMENTS_LOAD_FAILED = "No pudimos bajar tus turnos"
const val MY_APPOINTMENTS_REFRESH_FAILED = "No pudimos actualizar tus turnos. Mostrando lo guardado"
const val MY_APPOINTMENTS_NOT_LOADED = "Todavía no se bajaron tus turnos. Conectate para verlos."
const val STUDENT_AGENDA_OFFLINE = "Sin conexión · mostrando lo guardado"
const val APPOINTMENT_REQUESTED = "Turno pedido: tu entrenador lo tiene que confirmar"

const val REQUEST_APPOINTMENT = "Pedir turno"
const val REQUEST_OFFLINE = "Sin conexión: pedí o cancelá turnos cuando vuelva la red"
const val REQUEST_FAILED = "No pudimos pedir el turno. Probá de nuevo."
const val REQUEST_HINT = "Tu entrenador lo tiene que confirmar. Te avisamos cuando lo haga."
const val FREE_SLOTS_SUBTITLE = "Horarios libres de tu entrenador"
const val FREE_SLOTS_EMPTY = "Tu entrenador no tiene horarios libres en las próximas 4 semanas"
const val FREE_SLOTS_LOAD_FAILED = "No pudimos bajar los horarios libres"
const val FREE_SLOTS_REFRESH_FAILED = "No pudimos actualizar los horarios. Pueden estar desactualizados"
const val FREE_SLOTS_NOT_LOADED = "Todavía no se bajaron los horarios. Conectate para verlos."
const val FREE_SLOTS_OFFLINE = "Sin conexión · los horarios pueden estar desactualizados"
const val NO_TRAINER = "Todavía no tenés entrenador asignado"
const val NOTE_LABEL = "Nota para tu entrenador (opcional)"

/** Largo máximo de la nota (NOTES_MAX del backend). */
const val NOTE_MAX = 500

/** "120/500". */
fun noteCounter(length: Int): String = "$length/$NOTE_MAX"

/** "¿Cancelar tu turno del vie 06/11 a las 18:00? Le avisamos a tu entrenador." */
fun cancelMyQuestion(at: Instant): String = "¿Cancelar tu turno del ${shortDayHourLabel(at)}? Le avisamos a tu entrenador."
