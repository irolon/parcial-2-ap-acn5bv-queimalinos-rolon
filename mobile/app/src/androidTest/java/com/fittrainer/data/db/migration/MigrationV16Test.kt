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

/** v16 (medidas del alumno para el entrenador, E6): suma trainer_student_metrics(_sync) vacías y conserva la asistencia. */
@RunWith(AndroidJUnit4::class)
class MigrationV16Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra15a16ConservandoLaAsistencia() {
        helper.createDatabase(DB, 15).apply {
            execSQL(
                "INSERT INTO trainer_attendance (trainerId, studentId, month, sessions, assignedDays, prs, streakDays, daysJson, fetchedAt) " +
                    "VALUES ('t1', 's1', '2026-11', 6, 9, 2, 3, '[]', 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 16, true)

        db.query("SELECT sessions FROM trainer_attendance WHERE month = '2026-11'").use {
            assertTrue(it.moveToFirst())
            assertEquals(6, it.getInt(0))
        }
        for (table in listOf("trainer_student_metrics", "trainer_student_metrics_sync")) {
            db.query("SELECT COUNT(*) FROM $table").use {
                assertTrue(it.moveToFirst())
                assertEquals(0, it.getInt(0))
            }
        }
    }

    private companion object {
        const val DB = "migration-v16-test.db"
    }
}
