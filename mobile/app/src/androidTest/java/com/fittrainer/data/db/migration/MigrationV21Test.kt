package com.fittrainer.data.db.migration

import androidx.room.testing.MigrationTestHelper
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.fittrainer.data.db.FitTrainerDatabase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * v21 (E12): la v20 de E14 no tenía las tablas de progreso y notificaciones de develop. Se simula
 * borrándolas de la v20 del schema (es la de E14 más esas nueve tablas, mismo SQL para el resto).
 */
@RunWith(AndroidJUnit4::class)
class MigrationV21Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun laV20DeE14SumaLasTablasDeDevelopYConservaLoPendiente() {
        helper.createDatabase(DB, 20).apply {
            DEVELOP_TABLES.forEach { execSQL("DROP TABLE `$it`") }
            insertPending()
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 21, true, MIGRATION_20_21)

        assertPendingKept(db)
        DEVELOP_TABLES.forEach { table -> assertEquals(0, db.count(table)) }
    }

    @Test fun laV20DeDevelopYaTieneLasTablasYNoPierdeNada() {
        helper.createDatabase(DB, 20).apply {
            insertPending()
            execSQL(
                "INSERT INTO notifications (id, ownerId, type, title, body, dataJson, read, createdAt) " +
                    "VALUES ('n1', 'u1', 'pr', 'Récord', NULL, '{}', 0, 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 21, true, MIGRATION_20_21)

        assertPendingKept(db)
        assertEquals(1, db.count("notifications"))
    }

    /** Una sesión y una serie sin subir: lo que no se puede perder al migrar. */
    private fun SupportSQLiteDatabase.insertPending() {
        execSQL(
            "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, syncState, " +
                "currentPosition, currentSet) VALUES ('s1', 'u1', NULL, 'Libre', 1, 2, 'FINISHED', 'PENDING', 0, 1)"
        )
        execSQL(
            "INSERT INTO workout_sets (id, sessionId, position, exerciseId, setNumber, actualKg, actualReps, executedAt) " +
                "VALUES ('x1', 's1', 0, 'e1', 1, 40.0, 8, 1)"
        )
    }

    private fun assertPendingKept(db: SupportSQLiteDatabase) =
        db.query("SELECT s.syncState, x.syncState FROM workout_sessions s JOIN workout_sets x ON x.sessionId = s.id").use {
            assertTrue(it.moveToFirst())
            assertEquals("PENDING", it.getString(0))
            assertEquals("PENDING", it.getString(1))
        }

    private fun SupportSQLiteDatabase.count(table: String): Int =
        query("SELECT COUNT(*) FROM `$table`").use { it.moveToFirst(); it.getInt(0) }

    private companion object {
        const val DB = "migration-v21-test.db"
        val DEVELOP_TABLES = listOf(
            "progress_exercise_points", "progress_exercise_meta", "progress_body_points", "progress_body_meta",
            "progress_exercises", "progress_exercises_meta", "notifications", "notifications_meta", "notification_pending_reads",
        )
    }
}
