package com.fittrainer.data.db.migration.v2x

import androidx.room.testing.MigrationTestHelper
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.fittrainer.data.db.FitTrainerDatabase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** v28 (tarjeta 15): suma las cuatro tablas de logros, rachas y desafíos del alumno, vacías, y no toca lo que había. */
@RunWith(AndroidJUnit4::class)
class MigrationV28Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra27a28ConLasTablasDeGamificacionVacias() {
        helper.createDatabase(DB, 27).apply {
            execSQL(
                "INSERT INTO trainer_students (id, trainerId, name, email, goal, active, avatarUrl, createdAt, " +
                    "lastSessionAt, daysPerWeek, adherenceAssigned, adherenceDone, adherencePct, openSessionStartedAt) " +
                    "VALUES ('s1', 't1', 'Ana', 'ana@mail.com', NULL, 1, NULL, 1, NULL, 3, 3, 2, 67, NULL)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 28, true)

        db.query("SELECT name FROM trainer_students WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Ana", it.getString(0))
        }
        for (table in listOf("gamification_snapshot", "achievement_progress", "student_challenges", "celebrations")) {
            db.query("SELECT COUNT(*) FROM $table").use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
        }
    }

    private companion object {
        const val DB = "migration-v28-test.db"
    }
}
