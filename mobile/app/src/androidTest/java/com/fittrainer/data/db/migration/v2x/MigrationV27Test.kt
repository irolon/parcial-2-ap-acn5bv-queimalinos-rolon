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

/** v27 (GX4): suma openSessionStartedAt (null) a trainer_students y conserva los alumnos existentes. */
@RunWith(AndroidJUnit4::class)
class MigrationV27Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra26a27ConservandoLosAlumnos() {
        helper.createDatabase(DB, 26).apply {
            execSQL(
                "INSERT INTO trainer_students (id, trainerId, name, email, goal, active, avatarUrl, createdAt, " +
                    "lastSessionAt, daysPerWeek, adherenceAssigned, adherenceDone, adherencePct) " +
                    "VALUES ('s1', 't1', 'Ana', 'ana@mail.com', NULL, 1, NULL, 1, NULL, 3, 3, 2, 67)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 27, true)

        db.query("SELECT name, daysPerWeek, openSessionStartedAt FROM trainer_students WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Ana", it.getString(0))
            assertEquals(3, it.getInt(1))
            assertTrue(it.isNull(2))
        }
    }

    private companion object {
        const val DB = "migration-v27-test.db"
    }
}
