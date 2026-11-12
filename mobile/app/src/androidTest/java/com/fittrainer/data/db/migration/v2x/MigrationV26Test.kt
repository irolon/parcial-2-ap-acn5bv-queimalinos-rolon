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

/** v26 (GX8): suma level (null) a routines y trainer_routines y conserva las rutinas existentes. */
@RunWith(AndroidJUnit4::class)
class MigrationV26Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra25a26ConservandoLasRutinas() {
        helper.createDatabase(DB, 25).apply {
            execSQL("INSERT INTO routines (id, name, goal, days, createdAt) VALUES ('r1', 'Push', NULL, 'monday', 1)")
            execSQL(
                "INSERT INTO trainer_routines (trainerId, id, studentId, name, goal, days, active, createdAt) " +
                    "VALUES ('t1', 'r2', 's1', 'Pull', NULL, 'friday', 1, 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 26, true)

        db.query("SELECT name, level FROM routines WHERE id = 'r1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Push", it.getString(0))
            assertTrue(it.isNull(1))
        }
        db.query("SELECT name, level FROM trainer_routines WHERE id = 'r2'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Pull", it.getString(0))
            assertTrue(it.isNull(1))
        }
    }

    private companion object {
        const val DB = "migration-v26-test.db"
    }
}
