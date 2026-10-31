package com.fittrainer.data.api.progress

import retrofit2.http.GET
import retrofit2.http.Path

/** Progreso del alumno logueado (cliente principal: Bearer + refresh transparente). Sin `student_id`, el backend usa al propio alumno. */
interface ProgressApi {
    @GET("progress/exercise/{exerciseId}")
    suspend fun exercise(@Path("exerciseId") id: String): ExerciseProgressResponse

    @GET("progress/body/{studentId}")
    suspend fun body(@Path("studentId") studentId: String): BodyProgressResponse
}
