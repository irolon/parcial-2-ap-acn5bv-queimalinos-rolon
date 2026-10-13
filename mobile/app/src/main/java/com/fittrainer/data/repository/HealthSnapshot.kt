package com.fittrainer.data.repository

/** Estado del servidor tal como lo ve la UI. fetchedAt = epoch ms del dispositivo. */
data class HealthSnapshot(
    val status: String,
    val version: String,
    val serverTimestamp: String,
    val fetchedAt: Long,
)
