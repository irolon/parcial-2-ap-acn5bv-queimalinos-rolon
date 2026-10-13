package com.fittrainer.data.db

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface HealthDao {
    @Query("SELECT * FROM health_snapshot WHERE id = 0")
    fun observe(): Flow<HealthSnapshotEntity?>

    @Upsert
    suspend fun upsert(entity: HealthSnapshotEntity)
}
