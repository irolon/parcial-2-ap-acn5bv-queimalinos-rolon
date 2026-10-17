package com.fittrainer.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Último /health conocido. Una sola fila (id = 0). */
@Entity(tableName = "health_snapshot")
data class HealthSnapshotEntity(
    @PrimaryKey val id: Int = 0,
    val status: String,
    val version: String,
    val serverTimestamp: String,
    val fetchedAt: Long,
)
