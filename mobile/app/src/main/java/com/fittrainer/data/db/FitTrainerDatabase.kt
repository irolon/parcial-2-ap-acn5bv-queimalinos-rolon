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
import com.fittrainer.data.db.students.TrainerStudentDetailDao
import com.fittrainer.data.db.students.TrainerStudentDetailEntity
import com.fittrainer.data.db.students.TrainerStudentEntity
import com.fittrainer.data.db.students.TrainerStudentsDao
import com.fittrainer.data.db.students.TrainerStudentsSyncEntity
import com.fittrainer.data.db.students.sessions.TrainerSessionEntity
import com.fittrainer.data.db.students.sessions.TrainerSessionsDao
import com.fittrainer.data.db.students.sessions.TrainerSessionsSyncEntity
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
        TrainerStudentEntity::class,
        TrainerStudentsSyncEntity::class,
        TrainerStudentDetailEntity::class,
        TrainerSessionEntity::class,
        TrainerSessionsSyncEntity::class,
    ],
    version = 14,
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
        // La 10 y la 11 quedan para las PR #44 (gráficos) y #48 (notificaciones), que van antes en el merge:
        // cuando entren, esta pasa a AutoMigration(from = 11, to = 12) y se regenera 12.json.
        AutoMigration(from = 9, to = 12),
        AutoMigration(from = 12, to = 13),
        AutoMigration(from = 13, to = 14),
    ],
)
abstract class FitTrainerDatabase : RoomDatabase() {
    abstract fun healthDao(): HealthDao
    abstract fun routineDao(): RoutineDao
    abstract fun libraryDao(): LibraryDao
    abstract fun workoutDao(): WorkoutDao
    abstract fun historyDao(): HistoryDao
    abstract fun trainerStudentsDao(): TrainerStudentsDao
    abstract fun trainerStudentDetailDao(): TrainerStudentDetailDao
    abstract fun trainerSessionsDao(): TrainerSessionsDao
}
