package com.fittrainer.data.api

import kotlinx.serialization.Serializable

/** Respuesta de GET /health del backend: {"status":"ok","timestamp":"...","version":"0.1.0"}. */
@Serializable
data class HealthResponse(
    val status: String,
    val timestamp: String,
    val version: String,
)
