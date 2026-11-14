package com.fittrainer.data.db.account

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface MyProfileDao {
    /** null = nunca se bajó. */
    @Query("SELECT * FROM my_profile WHERE ownerId = :ownerId")
    fun observe(ownerId: String): Flow<MyProfileEntity?>

    @Query("SELECT * FROM my_profile WHERE ownerId = :ownerId")
    suspend fun get(ownerId: String): MyProfileEntity?

    @Upsert
    suspend fun upsert(row: MyProfileEntity)

    @Query("DELETE FROM my_profile WHERE ownerId = :ownerId")
    suspend fun clearOwner(ownerId: String)

    @Query("DELETE FROM my_profile")
    suspend fun clear()
}
