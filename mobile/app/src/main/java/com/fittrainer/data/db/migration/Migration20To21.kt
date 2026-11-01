package com.fittrainer.data.db.migration

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * v21 (E12): la v20 de la pila del entrenador (E14) se publicó sin las tablas de progreso (#44) y
 * notificaciones (#48) de develop; el merge las sumó a esa misma v20. Esta migración las crea solo
 * si faltan, así llegan igual una instalación de la v20 de E14 y una que viene de develop (v11 → v20,
 * que ya las tiene). No toca ninguna tabla existente: los registros pendientes se conservan.
 */
val MIGRATION_20_21 = object : Migration(20, 21) {
    override fun migrate(db: SupportSQLiteDatabase) {
        DEVELOP_TABLES.forEach(db::execSQL)
    }
}

/** El SQL que Room exporta para estas tablas (schemas/…/21.json), con IF NOT EXISTS. */
private val DEVELOP_TABLES = listOf(
    "CREATE TABLE IF NOT EXISTS `progress_exercise_points` (`ownerId` TEXT NOT NULL, `exerciseId` TEXT NOT NULL, " +
        "`date` TEXT NOT NULL, `maxKg` REAL, `e1rmKg` REAL, `sets` INTEGER NOT NULL, `reps` INTEGER NOT NULL, " +
        "PRIMARY KEY(`ownerId`, `exerciseId`, `date`))",
    "CREATE TABLE IF NOT EXISTS `progress_exercise_meta` (`ownerId` TEXT NOT NULL, `exerciseId` TEXT NOT NULL, " +
        "`defaultMetric` TEXT NOT NULL, `prMaxKg` REAL, `prMaxKgDate` TEXT, `prE1rmKg` REAL, `prE1rmDate` TEXT, " +
        "`fetchedAt` INTEGER NOT NULL, `trainedMarker` TEXT, PRIMARY KEY(`ownerId`, `exerciseId`))",
    "CREATE TABLE IF NOT EXISTS `progress_body_points` (`id` TEXT NOT NULL, `ownerId` TEXT NOT NULL, " +
        "`recordedAt` INTEGER NOT NULL, `weightKg` REAL, `heightCm` REAL, `bodyFatPct` REAL, `waistCm` REAL, " +
        "`hipCm` REAL, `chestCm` REAL, `bmi` REAL, PRIMARY KEY(`id`))",
    "CREATE INDEX IF NOT EXISTS `index_progress_body_points_ownerId_recordedAt` ON `progress_body_points` (`ownerId`, `recordedAt`)",
    "CREATE TABLE IF NOT EXISTS `progress_body_meta` (`ownerId` TEXT NOT NULL, `fetchedAt` INTEGER NOT NULL, PRIMARY KEY(`ownerId`))",
    "CREATE TABLE IF NOT EXISTS `progress_exercises` (`ownerId` TEXT NOT NULL, `exerciseId` TEXT NOT NULL, " +
        "`name` TEXT NOT NULL, `days` INTEGER NOT NULL, `lastDate` TEXT NOT NULL, PRIMARY KEY(`ownerId`, `exerciseId`))",
    "CREATE TABLE IF NOT EXISTS `progress_exercises_meta` (`ownerId` TEXT NOT NULL, `fetchedAt` INTEGER NOT NULL, PRIMARY KEY(`ownerId`))",
    "CREATE TABLE IF NOT EXISTS `notifications` (`id` TEXT NOT NULL, `ownerId` TEXT NOT NULL, `type` TEXT NOT NULL, " +
        "`title` TEXT NOT NULL, `body` TEXT, `dataJson` TEXT NOT NULL, `read` INTEGER NOT NULL, " +
        "`createdAt` INTEGER NOT NULL, PRIMARY KEY(`id`))",
    "CREATE INDEX IF NOT EXISTS `index_notifications_ownerId_createdAt` ON `notifications` (`ownerId`, `createdAt`)",
    "CREATE TABLE IF NOT EXISTS `notifications_meta` (`ownerId` TEXT NOT NULL, `everLoaded` INTEGER NOT NULL, " +
        "`nextBefore` TEXT, PRIMARY KEY(`ownerId`))",
    "CREATE TABLE IF NOT EXISTS `notification_pending_reads` (`ownerId` TEXT NOT NULL, `notificationId` TEXT NOT NULL, " +
        "PRIMARY KEY(`ownerId`, `notificationId`))",
)
