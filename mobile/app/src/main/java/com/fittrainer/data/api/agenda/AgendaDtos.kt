package com.fittrainer.data.api.agenda

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AvailabilityResponse(val data: List<AvailabilitySlotDto> = emptyList())

/** Una franja semanal: weekday 1 = lunes … 7 = domingo; horas en punto "HH:00" de Argentina. */
@Serializable
data class AvailabilitySlotDto(
    val weekday: Int,
    @SerialName("start_time") val startTime: String,
    @SerialName("end_time") val endTime: String,
)

@Serializable
data class AppointmentListResponse(val data: List<AppointmentDto> = emptyList())

@Serializable
data class AppointmentResponse(val data: AppointmentDto)

/** El alumno embebido en el turno. */
@Serializable
data class AppointmentStudentDto(
    val id: String,
    val name: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
)

/** Un turno de 60 min (toAppointmentView del backend). status: pending | confirmed | cancelled. */
@Serializable
data class AppointmentDto(
    val id: String,
    @SerialName("trainer_id") val trainerId: String? = null,
    val student: AppointmentStudentDto,
    @SerialName("scheduled_at") val scheduledAt: String,
    @SerialName("duration_min") val durationMin: Int = 60,
    val status: String,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

/** status: confirmed | cancelled (nadie reabre un cancelado; el alumno solo cancela). */
@Serializable
data class UpdateAppointmentRequest(val status: String)

@Serializable
data class FreeSlotsResponse(val data: List<FreeSlotDto> = emptyList())

/** Un horario libre: starts_at en ISO UTC; dura 60 min. */
@Serializable
data class FreeSlotDto(@SerialName("starts_at") val startsAt: String)

/**
 * El pedido del alumno. scheduled_at: ISO con zona ("2026-11-06T18:00:00-03:00"). notes null no viaja: el Json de
 * la app no codifica los valores por defecto (encodeDefaults = false).
 */
@Serializable
data class CreateAppointmentRequest(
    @SerialName("scheduled_at") val scheduledAt: String,
    val notes: String? = null,
)
