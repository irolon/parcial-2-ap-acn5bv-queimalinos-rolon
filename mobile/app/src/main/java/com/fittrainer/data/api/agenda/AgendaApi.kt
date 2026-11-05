package com.fittrainer.data.api.agenda

import com.fittrainer.data.auth.RequiredUser
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Tag

/**
 * Agenda del entrenador (E13) y turnos del alumno (tarjeta 16), por el cliente con Bearer. Cada rol ve lo suyo:
 * el GET de turnos filtra por el usuario logueado. Turno ajeno o inexistente → 403 FORBIDDEN (no se distingue). Un
 * cambio de estado que no corresponde → 409 INVALID_STATUS_TRANSITION; un turno ya pasado → 409 APPOINTMENT_PAST.
 *
 * Todas llevan [RequiredUser]: lo que se guarda bajo una cuenta nunca sale con el JWT de otra (hallazgo de Codex en
 * la tarjeta 16: un refresco por push de A que salía después de que entró B guardaba los turnos de B bajo A).
 */
interface AgendaApi {
    /** Las franjas propias del PT, ordenadas por día y hora. */
    @GET("availability")
    suspend fun availability(@Tag owner: RequiredUser): AvailabilityResponse

    /**
     * Horarios libres de 60 min (del PT del alumno, si lo pide él): from y to "YYYY-MM-DD" de Argentina, inclusivos
     * (hasta 31 días). Para el alumno corta en ahora + 28 días; sin entrenador da [] y un alumno de baja, 403.
     */
    @GET("availability/free")
    suspend fun freeSlots(@Tag owner: RequiredUser, @Query("from") from: String, @Query("to") to: String): FreeSlotsResponse

    /** Todos los estados, por scheduled_at. from y to: días de Argentina "YYYY-MM-DD", inclusivos (hasta 62 días). */
    @GET("appointments")
    suspend fun appointments(@Tag owner: RequiredUser, @Query("from") from: String, @Query("to") to: String): AppointmentListResponse

    /**
     * El alumno pide un turno: queda pending. 409 SLOT_TAKEN (ya lo pidió otro), 400 SLOT_UNAVAILABLE (fuera de la
     * disponibilidad, pasado o más allá de 28 días), 409 APPOINTMENT_LIMIT (ya tiene 3 pendientes) y 403 (sin PT).
     */
    @POST("appointments")
    suspend fun create(@Tag owner: RequiredUser, @Body body: CreateAppointmentRequest): AppointmentResponse

    @PATCH("appointments/{id}")
    suspend fun updateStatus(@Tag owner: RequiredUser, @Path("id") id: String, @Body body: UpdateAppointmentRequest): AppointmentResponse
}
