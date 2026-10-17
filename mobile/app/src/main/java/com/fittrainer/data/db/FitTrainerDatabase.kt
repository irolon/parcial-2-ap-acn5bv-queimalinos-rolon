package com.fittrainer.data.db

import androidx.room.AutoMigration
import androidx.room.Database
import androidx.room.RoomDatabase
import com.fittrainer.data.db.library.LibraryDao
import com.fittrainer.data.db.library.LibraryExerciseEntity
import com.fittrainer.data.db.library.LibrarySyncEntity
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
        LibraryExerciseEntity::class,
        LibrarySyncEntity::class,
    ],
    version = 3,
    exportSchema = true,
    // Nunca migraciones destructivas: desde el S3 Room guarda registros pendientes de subir.
    // Cada versión nueva suma su migración y su caso en FitTrainerDatabaseMigrationTest.
    autoMigrations = [AutoMigration(from = 1, to = 2), AutoMigration(from = 2, to = 3)],
)
abstract class FitTrainerDatabase : RoomDatabase() {
    abstract fun healthDao(): HealthDao
    abstract fun routineDao(): RoutineDao
    abstract fun libraryDao(): LibraryDao
}
