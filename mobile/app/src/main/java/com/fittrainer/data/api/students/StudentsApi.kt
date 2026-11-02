package com.fittrainer.data.api.students

import kotlinx.serialization.json.JsonObject
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Módulo Students del backend, del lado del entrenador (va por el cliente con Bearer). */
interface StudentsApi {
    /** GET /students: una página de los alumnos del entrenador logueado; `active` elige activos o dados de baja. */
    @GET("students")
    suspend fun list(
        @Query("active") active: Boolean,
        @Query("page") page: Int,
        @Query("limit") limit: Int = PAGE_LIMIT,
    ): StudentListResponse

    /** GET /students/:id: la ficha. Ajeno o inexistente → 403. */
    @GET("students/{id}")
    suspend fun get(@Path("id") id: String): StudentDetailResponse

    /**
     * PATCH /students/:id. El body es un JsonObject armado a mano: hay que distinguir "borrar"
     * (la clave con null) de "no tocar" (la clave ausente). Devuelve la ficha como el GET.
     */
    @PATCH("students/{id}")
    suspend fun update(@Path("id") id: String, @Body body: JsonObject): StudentDetailResponse

    /** GET /students/:id/attendance: resumen y asistencia del mes (month = YYYY-MM, no futuro). */
    @GET("students/{id}/attendance")
    suspend fun attendance(@Path("id") id: String, @Query("month") month: String): AttendanceResponse

    /** GET /students/:id/streak: racha contra los días asignados (ADR 0005). */
    @GET("students/{id}/streak")
    suspend fun streak(@Path("id") id: String): StreakResponse

    /** Historial de medidas, de la más vieja a la más nueva, con el IMC del backend. */
    @GET("students/{id}/metrics")
    suspend fun metrics(@Path("id") id: String): MetricsResponse

    /** 201 nueva, 200 si es un reintento con el mismo id. */
    @POST("students/{id}/metrics")
    suspend fun addMetric(@Path("id") id: String, @Body body: CreateMetricRequest): MetricResponse

    /** 204; 404 si ya no existe. Response para leer el código sin excepción. */
    @DELETE("students/{id}/metrics/{metricId}")
    suspend fun deleteMetric(@Path("id") id: String, @Path("metricId") metricId: String): Response<Unit>

    /** GET /students/overview: Inicio del entrenador (KPIs, requieren atención y actividad reciente). */
    @GET("students/overview")
    suspend fun overview(): OverviewResponse

    companion object {
        /** El máximo que acepta el backend. */
        const val PAGE_LIMIT = 100
    }
}
