package com.fittrainer.data.agenda

import java.time.Instant

/**
 * Estados de un turno (APPOINTMENT_STATUS del backend). Un valor que la app no conoce se guarda en Room tal
 * cual y se muestra como cancelado y sin acciones: nunca se ofrece confirmar algo que no se entiende.
 */
enum class AppointmentStatus(val wire: String) {
    PENDING("pending"),
    CONFIRMED("confirmed"),
    CANCELLED("cancelled"),
    ;

    companion object {
        fun fromWire(value: String): AppointmentStatus = entries.firstOrNull { it.wire == value } ?: CANCELLED
    }
}

/** Un turno de 60 min de la agenda del entrenador. at: cuándo empieza. */
data class Appointment(
    val id: String,
    val studentId: String,
    val studentName: String,
    val avatarUrl: String?,
    val at: Instant,
    val status: AppointmentStatus,
    val notes: String?,
)

/** Una franja semanal: weekday 1 = lunes … 7 = domingo; de startHour a endHour (horas en punto de Argentina). */
data class AvailabilitySlot(val weekday: Int, val startHour: Int, val endHour: Int)

/** Los turnos de una semana que ya se bajó, por hora. */
data class AgendaWeekCache(val appointments: List<Appointment>, val fetchedAt: Instant)

data class AvailabilityCache(val slots: List<AvailabilitySlot>, val fetchedAt: Instant)

/** 409 INVALID_STATUS_TRANSITION o APPOINTMENT_PAST: el turno cambió o ya pasó. Lleva el mensaje del backend. */
class AppointmentConflictException(message: String) : Exception(message)

/** 403: el turno es ajeno o ya no existe (ya salió del caché). */
class AppointmentGoneException : Exception("Este turno ya no existe")
