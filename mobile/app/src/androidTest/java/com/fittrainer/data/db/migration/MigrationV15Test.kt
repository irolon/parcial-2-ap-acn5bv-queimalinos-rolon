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

/** v15 (asistencia del alumno para el entrenador, E5): suma trainer_attendance vacía y conserva las sesiones de la v14. */
@RunWith(AndroidJUnit4::class)
class MigrationV15Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra14a15ConservandoLasSesiones() {
        helper.createDatabase(DB, 14).apply {
            execSQL(
                "INSERT INTO trainer_sessions (trainerId, id, studentId, startedAt, finishedAt, durationMin, routineName, rpe, notes, " +
                    "trainerComment, hasModifications, sets, volumeKg, hasPr, listed, exercisesJson) " +
                    "VALUES ('t1', 'x1', 's1', 1, 2, 60, 'Push', 8, NULL, 'Bien', 0, 3, 100.0, 0, 1, NULL)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 15, true)

        db.query("SELECT trainerComment FROM trainer_sessions WHERE id = 'x1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Bien", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM trainer_attendance").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }

    private companion object {
        const val DB = "migration-v15-test.db"
    }
}
