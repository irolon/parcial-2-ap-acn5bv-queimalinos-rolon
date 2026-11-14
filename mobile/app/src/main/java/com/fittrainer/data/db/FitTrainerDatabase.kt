package com.fittrainer.data.db

import androidx.room.AutoMigration
import androidx.room.Database
import androidx.room.RoomDatabase
import com.fittrainer.data.db.chat.AiChatDao
import com.fittrainer.data.db.chat.AiChatMessageEntity
import com.fittrainer.data.db.agenda.TrainerAgendaWeekEntity
import com.fittrainer.data.db.agenda.TrainerAppointmentEntity
import com.fittrainer.data.db.agenda.TrainerAvailabilityEntity
import com.fittrainer.data.db.agenda.TrainerAvailabilitySyncEntity
import com.fittrainer.data.db.agenda.student.StudentAgendaDao
import com.fittrainer.data.db.agenda.student.StudentAppointmentEntity
import com.fittrainer.data.db.agenda.student.StudentAppointmentsSyncEntity
import com.fittrainer.data.db.agenda.student.StudentFreeSlotEntity
import com.fittrainer.data.db.agenda.student.StudentFreeSlotsSyncEntity
import com.fittrainer.data.db.challenges.trainer.TrainerChallengeEntity
import com.fittrainer.data.db.challenges.trainer.TrainerChallengesSyncEntity
import com.fittrainer.data.db.challenges.trainer.TrainerStudentChallengeEntity
import com.fittrainer.data.db.challenges.trainer.TrainerStudentChallengesSyncEntity
import com.fittrainer.data.db.database.TrainerDaos
import com.fittrainer.data.db.exercises.trainer.TrainerExerciseEntity
import com.fittrainer.data.db.gamification.AchievementProgressEntity
import com.fittrainer.data.db.gamification.CelebrationEntity
import com.fittrainer.data.db.gamification.GamificationDao
import com.fittrainer.data.db.gamification.GamificationSnapshotEntity
import com.fittrainer.data.db.gamification.StudentChallengeEntity
import com.fittrainer.data.db.library.LibraryDao
import com.fittrainer.data.db.library.LibraryExerciseEntity
import com.fittrainer.data.db.library.LibrarySyncEntity
import com.fittrainer.data.db.messages.trainer.TrainerConversationEntity
import com.fittrainer.data.db.messages.trainer.TrainerConversationsSyncEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessageEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessageThreadEntity
import com.fittrainer.data.db.notifications.NotificationDao
import com.fittrainer.data.db.notifications.NotificationEntity
import com.fittrainer.data.db.notifications.NotificationMetaEntity
import com.fittrainer.data.db.notifications.NotificationPendingReadEntity
import com.fittrainer.data.db.account.MyProfileDao
import com.fittrainer.data.db.account.MyProfileEntity
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
import com.fittrainer.data.db.routines.trainer.TrainerRoutineEntity
import com.fittrainer.data.db.routines.trainer.TrainerRoutineExerciseEntity
import com.fittrainer.data.db.routines.trainer.TrainerRoutinesSyncEntity
import com.fittrainer.data.db.students.TrainerStudentDetailEntity
import com.fittrainer.data.db.students.TrainerStudentEntity
import com.fittrainer.data.db.students.TrainerStudentsSyncEntity
import com.fittrainer.data.db.students.metrics.TrainerStudentMetricEntity
import com.fittrainer.data.db.students.overview.TrainerOverviewEntity
import com.fittrainer.data.db.students.metrics.TrainerStudentMetricsSyncEntity
import com.fittrainer.data.db.students.progress.TrainerAttendanceEntity
import com.fittrainer.data.db.students.sessions.TrainerSessionEntity
import com.fittrainer.data.db.students.sessions.TrainerSessionsSyncEntity
import com.fittrainer.data.db.templates.trainer.TrainerTemplateEntity
import com.fittrainer.data.db.templates.trainer.TrainerTemplatesSyncEntity
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
        NotificationEntity::class,
        NotificationMetaEntity::class,
        NotificationPendingReadEntity::class,
        TrainerStudentEntity::class,
        TrainerStudentsSyncEntity::class,
        TrainerStudentDetailEntity::class,
        TrainerSessionEntity::class,
        TrainerSessionsSyncEntity::class,
        TrainerAttendanceEntity::class,
        TrainerStudentMetricEntity::class,
        TrainerStudentMetricsSyncEntity::class,
        TrainerOverviewEntity::class,
        TrainerRoutineEntity::class,
        TrainerRoutineExerciseEntity::class,
        TrainerRoutinesSyncEntity::class,
        TrainerExerciseEntity::class,
        TrainerTemplateEntity::class,
        TrainerTemplatesSyncEntity::class,
        TrainerChallengeEntity::class,
        TrainerChallengesSyncEntity::class,
        TrainerStudentChallengeEntity::class,
        TrainerStudentChallengesSyncEntity::class,
        TrainerConversationEntity::class,
        TrainerConversationsSyncEntity::class,
        TrainerMessageEntity::class,
        TrainerMessageThreadEntity::class,
        TrainerAppointmentEntity::class,
        TrainerAgendaWeekEntity::class,
        TrainerAvailabilityEntity::class,
        TrainerAvailabilitySyncEntity::class,
        StudentAppointmentEntity::class,
        StudentAppointmentsSyncEntity::class,
        StudentFreeSlotEntity::class,
        StudentFreeSlotsSyncEntity::class,
        AiChatMessageEntity::class,
        GamificationSnapshotEntity::class,
        AchievementProgressEntity::class,
        StudentChallengeEntity::class,
        CelebrationEntity::class,
        MyProfileEntity::class,
    ],
    version = 29,
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
        AutoMigration(from = 9, to = 10),
        AutoMigration(from = 10, to = 11),
        AutoMigration(from = 11, to = 12),
        AutoMigration(from = 12, to = 13),
        AutoMigration(from = 13, to = 14),
        AutoMigration(from = 14, to = 15),
        AutoMigration(from = 15, to = 16),
        AutoMigration(from = 16, to = 17),
        AutoMigration(from = 17, to = 18),
        AutoMigration(from = 18, to = 19),
        AutoMigration(from = 19, to = 20),
        AutoMigration(from = 20, to = 21),
        // v22: has_image en los mensajes (#73), columna con default 0.
        AutoMigration(from = 21, to = 22),
        // v23: agenda del entrenador (E13), cuatro tablas nuevas.
        AutoMigration(from = 22, to = 23),
        // v24: turnos del alumno (tarjeta 16), cuatro tablas nuevas.
        AutoMigration(from = 23, to = 24),
        // v25: chat IA del alumno (tarjeta 14), una tabla nueva.
        AutoMigration(from = 24, to = 25),
        // v26: nivel de la rutina (GX8), routines.level y trainer_routines.level.
        AutoMigration(from = 25, to = 26),
        // v27: sesión en curso del alumno (GX4), trainer_students.openSessionStartedAt.
        AutoMigration(from = 26, to = 27),
        // v28: logros, rachas y desafíos del alumno (tarjeta 15), cuatro tablas nuevas.
        AutoMigration(from = 27, to = 28),
        // v29: perfil propio (Perfil y Más), la tabla my_profile.
        AutoMigration(from = 28, to = 29),
    ],
)
// Los DAO del rol entrenador se declaran en TrainerDaos (database/), para que este archivo no pase de 200 líneas.
abstract class FitTrainerDatabase : RoomDatabase(), TrainerDaos {
    abstract fun healthDao(): HealthDao
    abstract fun routineDao(): RoutineDao
    abstract fun libraryDao(): LibraryDao
    abstract fun workoutDao(): WorkoutDao
    abstract fun historyDao(): HistoryDao
    abstract fun progressDao(): ProgressDao
    abstract fun notificationDao(): NotificationDao
    abstract fun studentAgendaDao(): StudentAgendaDao
    abstract fun aiChatDao(): AiChatDao
    abstract fun gamificationDao(): GamificationDao
    abstract fun myProfileDao(): MyProfileDao
}
