package com.fittrainer.testing.fakes.agenda

import com.fittrainer.data.api.agenda.AgendaApi
import com.fittrainer.data.api.agenda.AppointmentDto
import com.fittrainer.data.api.agenda.AppointmentListResponse
import com.fittrainer.data.api.agenda.AppointmentResponse
import com.fittrainer.data.api.agenda.AppointmentStudentDto
import com.fittrainer.data.api.agenda.AvailabilityResponse
import com.fittrainer.data.api.agenda.AvailabilitySlotDto
import com.fittrainer.data.api.agenda.UpdateAppointmentRequest
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.testing.fakes.auth.httpError
import java.time.Instant
import java.time.LocalDate
import kotlinx.coroutines.CompletableDeferred

/** Un turno del wire. at: ISO UTC (vie 06/11 18:00 de Argentina = "2026-11-06T21:00:00.000Z"). */
fun appointmentDto(id: String, at: String, status: String = "pending", name: String? = "Lucía Gómez", notes: String? = null) =
    AppointmentDto(id, "t1", AppointmentStudentDto("st-$id", name, null), at, 60, status, notes, "2026-10-31T15:20:11.123456+00:00")

fun slotDto(weekday: Int, start: String, end: String) = AvailabilitySlotDto(weekday, start, end)

/** El body de error del backend con su mensaje (para ver que el 409 lo pasa tal cual). */
fun apiErrorWithMessage(status: Int, code: String, message: String) =
    httpError(status, """{"error":{"code":"$code","message":"$message"}}""")

/**
 * Backend en memoria. Las transiciones son las del PATCH: pending → confirmed, pending o confirmed → cancelled;
 * lo que empieza antes de [now] da 409 APPOINTMENT_PAST; un id que no está, 403.
 */
class FakeAgendaApi : AgendaApi {
    val appointments = mutableListOf<AppointmentDto>()
    var slots = listOf(slotDto(1, "09:00", "13:00"), slotDto(1, "17:00", "21:00"), slotDto(5, "18:00", "20:00"))
    var now: Instant = Instant.parse("2026-11-04T12:00:00Z")
    var error: Throwable? = null
    var writeError: Throwable? = null
    /** El GET toma la foto del servidor ANTES de esperar: una respuesta que llega tarde. */
    var weekGate: CompletableDeferred<Unit>? = null
    val weekCalls = mutableListOf<Pair<String, String>>()
    val patchCalls = mutableListOf<Pair<String, String>>()
    var availabilityCalls = 0

    override suspend fun availability(): AvailabilityResponse {
        availabilityCalls++
        error?.let { throw it }
        return AvailabilityResponse(slots)
    }

    override suspend fun appointments(from: String, to: String): AppointmentListResponse {
        weekCalls += from to to
        val first = LocalDate.parse(from)
        val last = LocalDate.parse(to)
        val snapshot = appointments.filter {
            val day = Instant.parse(it.scheduledAt).atZone(ARGENTINA).toLocalDate()
            !day.isBefore(first) && !day.isAfter(last)
        }.sortedBy { it.scheduledAt }
        weekGate?.await()
        error?.let { throw it }
        return AppointmentListResponse(snapshot)
    }

    override suspend fun updateStatus(id: String, body: UpdateAppointmentRequest): AppointmentResponse {
        patchCalls += id to body.status
        writeError?.let { throw it }
        val index = appointments.indexOfFirst { it.id == id }
        if (index < 0) throw httpError(403, """{"error":{"code":"FORBIDDEN","message":"No autorizado"}}""")
        val current = appointments[index]
        if (!Instant.parse(current.scheduledAt).isAfter(now)) throw apiErrorWithMessage(409, "APPOINTMENT_PAST", "El turno ya pasó")
        val ok = (current.status == "pending" && body.status == "confirmed") ||
            (current.status in setOf("pending", "confirmed") && body.status == "cancelled")
        if (!ok) throw apiErrorWithMessage(409, "INVALID_STATUS_TRANSITION", "No se puede pasar el turno a ese estado")
        val updated = current.copy(status = body.status)
        appointments[index] = updated
        return AppointmentResponse(updated)
    }
}
