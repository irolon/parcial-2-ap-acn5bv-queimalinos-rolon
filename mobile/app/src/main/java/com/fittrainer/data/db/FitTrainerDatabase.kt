package com.fittrainer.data.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [HealthSnapshotEntity::class], version = 1, exportSchema = true)
abstract class FitTrainerDatabase : RoomDatabase() {
    abstract fun healthDao(): HealthDao
}
