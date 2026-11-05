package com.fittrainer.testing.fakes.agenda

import com.fittrainer.data.api.agenda.AgendaApi
import com.fittrainer.data.api.agenda.AppointmentDto
import com.fittrainer.data.api.agenda.AppointmentListResponse
import com.fittrainer.data.api.agenda.AppointmentResponse
import com.fittrainer.data.api.agenda.AppointmentStudentDto
import com.fittrainer.data.api.agenda.AvailabilityResponse
import com.fittrainer.data.api.agenda.AvailabilitySlotDto
import com.fittrainer.data.api.agenda.CreateAppointmentRequest
import com.fittrainer.data.api.agenda.FreeSlotDto
import com.fittrainer.data.api.agenda.FreeSlotsResponse
import com.fittrainer.data.api.agenda.UpdateAppointmentRequest
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.testing.fakes.auth.httpError
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
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
 * lo que empieza antes de [now] da 409 APPOINTMENT_PAST; un id que no está, 403. El alumno (tarjeta 16) pide de
 * [free]: un horario que no está ahí da 409 SLOT_TAKEN, y el que sale bien deja de estar libre.
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
    /** Los horarios libres, en ISO UTC. */
    val free = mutableListOf<String>()
    val freeCalls = mutableListOf<Pair<String, String>>()
    val createCalls = mutableListOf<CreateAppointmentRequest>()
    /** El [RequiredUser] de cada llamada, en orden. */
    val owners = mutableListOf<String>()
    /** La cuenta logueada: con otra, la request no sale (como AuthInterceptor). null = no se chequea. */
    var loggedIn: String? = null
    /** El GET de libres toma la foto ANTES de esperar, como [weekGate]. */
    var freeGate: CompletableDeferred<Unit>? = null
    var createError: Throwable? = null
    /** El POST espera acá antes de responder: un pedido en vuelo. */
    var createGate: CompletableDeferred<Unit>? = null

    override suspend fun availability(owner: RequiredUser): AvailabilityResponse {
        owners += owner.userId
        check(owner)
        availabilityCalls++
        error?.let { throw it }
        return AvailabilityResponse(slots)
    }

    override suspend fun appointments(owner: RequiredUser, from: String, to: String): AppointmentListResponse {
        owners += owner.userId
        check(owner)
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

    override suspend fun updateStatus(owner: RequiredUser, id: String, body: UpdateAppointmentRequest): AppointmentResponse {
        owners += owner.userId
        check(owner)
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

    override suspend fun freeSlots(owner: RequiredUser, from: String, to: String): FreeSlotsResponse {
        owners += owner.userId
        check(owner)
        freeCalls += from to to
        val snapshot = free.sorted().map { FreeSlotDto(it) }
        freeGate?.await()
        error?.let { throw it }
        return FreeSlotsResponse(snapshot)
    }

    override suspend fun create(owner: RequiredUser, body: CreateAppointmentRequest): AppointmentResponse {
        owners += owner.userId
        check(owner)
        createCalls += body
        createGate?.await()
        createError?.let { throw it }
        val at = OffsetDateTime.parse(body.scheduledAt).toInstant()
        if (free.none { Instant.parse(it) == at }) throw apiErrorWithMessage(409, "SLOT_TAKEN", "Ese horario ya está ocupado")
        free.removeAll { Instant.parse(it) == at }
        val created = AppointmentDto("new-${createCalls.size}", "t1", AppointmentStudentDto("u1", "Ana Pérez", null), at.toString(), 60, "pending", body.notes)
        appointments += created
        return AppointmentResponse(created)
    }
}

private fun FakeAgendaApi.check(owner: RequiredUser) {
    if (loggedIn != null && loggedIn != owner.userId) throw AccountChangedException()
}
