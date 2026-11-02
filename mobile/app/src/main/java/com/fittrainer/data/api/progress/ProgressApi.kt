package com.fittrainer.data.api.progress

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/** Progreso del alumno logueado (cliente principal: Bearer + refresh transparente). Sin `student_id`, el backend usa al propio alumno. */
interface ProgressApi {
    @GET("progress/exercise/{exerciseId}")
    suspend fun exercise(@Path("exerciseId") id: String): ExerciseProgressResponse

    @GET("progress/body/{studentId}")
    suspend fun body(@Path("studentId") studentId: String): BodyProgressResponse

    /** Ejercicios entrenados (sin filtrar por rango) y volumen semanal desde [from] (YYYY-MM-DD, hoy en Argentina: viene corto). */
    @GET("progress/overview")
    suspend fun overview(@Query("from") from: String?): ProgressOverviewResponse
}
