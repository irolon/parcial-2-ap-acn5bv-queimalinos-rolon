package com.fittrainer.data.agenda.student

import com.fittrainer.data.agenda.Appointment
import java.time.Instant

/** «Mis turnos» baja de hoy a hoy + 60 días (el GET acepta hasta 62). */
const val MY_APPOINTMENTS_DAYS_AHEAD = 60L

/** Los horarios libres, de hoy a hoy + 27: los 28 días en que el backend deja pedir turno al alumno. */
const val FREE_SLOTS_DAYS_AHEAD = 27L

/** Los turnos del alumno desde hoy, por hora, y cuándo se bajaron. */
data class MyAppointmentsCache(val appointments: List<Appointment>, val fetchedAt: Instant)

/** Los horarios libres de la última bajada (cada uno empieza en ese instante y dura 60 min). */
data class FreeSlotsCache(val slots: List<Instant>, val fetchedAt: Instant)

/** 409 SLOT_TAKEN: otro alumno pidió ese horario en el medio. Lleva el mensaje del backend. */
class SlotTakenException(message: String) : Exception(message)

/** 400 SLOT_UNAVAILABLE: el horario ya no está en la disponibilidad, ya pasó o queda fuera de los 28 días. */
class SlotUnavailableException(message: String) : Exception(message)

/** 409 APPOINTMENT_LIMIT: ya tiene 3 turnos pendientes. */
class AppointmentLimitException(message: String) : Exception(message)

/** 403 al pedir o al ver los libres: el alumno no tiene entrenador (o lo dieron de baja). */
class NoTrainerException : Exception("Sin entrenador")
