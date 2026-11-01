package com.fittrainer.data.db

import androidx.room.AutoMigration
import androidx.room.Database
import androidx.room.RoomDatabase
import com.fittrainer.data.db.library.LibraryDao
import com.fittrainer.data.db.library.LibraryExerciseEntity
import com.fittrainer.data.db.library.LibrarySyncEntity
import com.fittrainer.data.db.progress.ProgressBodyMetaEntity
import com.fittrainer.data.db.progress.ProgressBodyPointEntity
import com.fittrainer.data.db.progress.ProgressDao
import com.fittrainer.data.db.progress.ProgressExerciseEntity
import com.fittrainer.data.db.progress.ProgressExerciseMetaEntity
import com.fittrainer.data.db.progress.ProgressExercisePointEntity
import com.fittrainer.data.db.progress.ProgressExercisesMetaEntity
import com.fittrainer.data.db.routine.RoutineDao
import com.fittrainer.data.db.routine.RoutineEntity
import com.fittrainer.data.db.routine.RoutineExerciseEntity
import com.fittrainer.data.db.routine.RoutineSyncEntity
import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.db.workout.WorkoutExerciseEntity
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.db.workout.WorkoutSetEntity
import com.fittrainer.data.db.workout.history.HistoryCommentSeenEntity
import com.fittrainer.data.db.workout.history.HistoryDao
import com.fittrainer.data.db.workout.history.HistoryExerciseEntity
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.data.db.workout.history.HistorySetEntity

@Database(
    entities = [
        HealthSnapshotEntity::class,
        RoutineEntity::class,
        RoutineExerciseEntity::class,
        RoutineSyncEntity::class,
        LibraryExerciseEntity::class,
        LibrarySyncEntity::class,
        WorkoutSessionEntity::class,
        WorkoutExerciseEntity::class,
        WorkoutSetEntity::class,
        HistorySessionEntity::class,
        HistoryExerciseEntity::class,
        HistorySetEntity::class,
        HistoryCommentSeenEntity::class,
        ProgressExercisePointEntity::class,
        ProgressExerciseMetaEntity::class,
        ProgressBodyPointEntity::class,
        ProgressBodyMetaEntity::class,
        ProgressExerciseEntity::class,
        ProgressExercisesMetaEntity::class,
    ],
    version = 9,
    exportSchema = true,
    // Nunca migraciones destructivas: desde el S3 Room guarda registros pendientes de subir.
    // Cada versión nueva suma su migración y su caso en los tests de androidTest/.../data/db/migration/.
    autoMigrations = [
        AutoMigration(from = 1, to = 2),
        AutoMigration(from = 2, to = 3),
        AutoMigration(from = 3, to = 4),
        AutoMigration(from = 4, to = 5),
        AutoMigration(from = 5, to = 6),
        AutoMigration(from = 6, to = 7),
        AutoMigration(from = 7, to = 8),
        AutoMigration(from = 8, to = 9),
    ],
)
abstract class FitTrainerDatabase : RoomDatabase() {
    abstract fun healthDao(): HealthDao
    abstract fun routineDao(): RoutineDao
    abstract fun libraryDao(): LibraryDao
    abstract fun workoutDao(): WorkoutDao
    abstract fun historyDao(): HistoryDao
    abstract fun progressDao(): ProgressDao
}
