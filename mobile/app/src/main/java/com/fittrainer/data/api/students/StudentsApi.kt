package com.fittrainer.data.api.students

import retrofit2.http.GET
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

    companion object {
        /** El máximo que acepta el backend. */
        const val PAGE_LIMIT = 100
    }
}
