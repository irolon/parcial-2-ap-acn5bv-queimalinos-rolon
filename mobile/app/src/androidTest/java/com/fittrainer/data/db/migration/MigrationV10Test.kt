package com.fittrainer.data.db.migration

import androidx.room.testing.MigrationTestHelper
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.fittrainer.data.db.FitTrainerDatabase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** v10 (gráficos): el historial guardado sigue igual y las tablas de progreso arrancan vacías. */
@RunWith(AndroidJUnit4::class)
class MigrationV10Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra9a10ConservandoElHistorialYConLasTablasDeProgresoVacias() {
        helper.createDatabase(DB, 9).apply {
            execSQL(
                "INSERT INTO history_sessions (id, ownerId, startedAt, hasModifications, sets, volumeKg, hasPr, inLatest, detailLoaded) " +
                    "VALUES ('h1', 'u1', 1, 0, 3, 300.0, 0, 1, 1)"
            )
            execSQL("INSERT INTO history_exercises (sessionId, position, exerciseName, isPr) VALUES ('h1', 0, 'Press', 0)")
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 10, true)

        db.query("SELECT exerciseName FROM history_exercises WHERE sessionId = 'h1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Press", it.getString(0))
        }
        for (table in PROGRESS_TABLES) {
            db.query("SELECT COUNT(*) FROM $table").use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
        }
    }

    private companion object {
        const val DB = "migration-v10-test.db"
        val PROGRESS_TABLES = listOf(
            "progress_exercise_points", "progress_exercise_meta", "progress_body_points",
            "progress_body_meta", "progress_exercises", "progress_exercises_meta",
        )
    }
}
