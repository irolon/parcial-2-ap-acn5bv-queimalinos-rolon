package com.fittrainer.data.api

import retrofit2.http.GET

/**
 * API REST del backend. Los endpoints futuros van SIN barra inicial (relativos a /api/).
 * /health es la excepción: el backend lo expone fuera de /api, por eso la barra inicial.
 */
interface FitTrainerApi {
    @GET("/health")
    suspend fun health(): HealthResponse
}
