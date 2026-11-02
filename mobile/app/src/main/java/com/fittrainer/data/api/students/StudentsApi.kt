package com.fittrainer.data.api.students

import kotlinx.serialization.json.JsonObject
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
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

    companion object {
        /** El máximo que acepta el backend. */
        const val PAGE_LIMIT = 100
    }
}
