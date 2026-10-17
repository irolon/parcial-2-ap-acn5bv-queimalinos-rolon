package com.fittrainer.data.db

import androidx.room.AutoMigration
import androidx.room.Database
import androidx.room.RoomDatabase
import com.fittrainer.data.db.routine.RoutineDao
import com.fittrainer.data.db.routine.RoutineEntity
import com.fittrainer.data.db.routine.RoutineExerciseEntity
import com.fittrainer.data.db.routine.RoutineSyncEntity

@Database(
    entities = [
        HealthSnapshotEntity::class,
        RoutineEntity::class,
        RoutineExerciseEntity::class,
        RoutineSyncEntity::class,
    ],
    version = 2,
    exportSchema = true,
    // Nunca migraciones destructivas: desde el S3 Room guarda registros pendientes de subir.
    // Cada versión nueva suma su migración y su caso en FitTrainerDatabaseMigrationTest.
    autoMigrations = [AutoMigration(from = 1, to = 2)],
)
abstract class FitTrainerDatabase : RoomDatabase() {
    abstract fun healthDao(): HealthDao
    abstract fun routineDao(): RoutineDao
}
