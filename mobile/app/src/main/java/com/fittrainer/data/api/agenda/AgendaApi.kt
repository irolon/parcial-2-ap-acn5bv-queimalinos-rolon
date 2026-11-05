package com.fittrainer.data.api.agenda

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Agenda del entrenador (E13), por el cliente con Bearer. Turno ajeno o inexistente → 403 FORBIDDEN (no se
 * distingue). Un cambio de estado que no corresponde → 409 INVALID_STATUS_TRANSITION; un turno ya pasado → 409
 * APPOINTMENT_PAST.
 */
interface AgendaApi {
    /** Las franjas propias, ordenadas por día y hora. */
    @GET("availability")
    suspend fun availability(): AvailabilityResponse

    /** Todos los estados, por scheduled_at. from y to: días de Argentina "YYYY-MM-DD", inclusivos (hasta 62 días). */
    @GET("appointments")
    suspend fun appointments(@Query("from") from: String, @Query("to") to: String): AppointmentListResponse

    @PATCH("appointments/{id}")
    suspend fun updateStatus(@Path("id") id: String, @Body body: UpdateAppointmentRequest): AppointmentResponse
}
