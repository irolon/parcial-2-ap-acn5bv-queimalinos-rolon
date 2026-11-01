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

/** v19 (plantillas del entrenador, E9): suma trainer_templates y su sync vacías y conserva las rutinas de la v18. */
@RunWith(AndroidJUnit4::class)
class MigrationV19Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra18a19ConservandoLasRutinas() {
        helper.createDatabase(DB, 18).apply {
            execSQL(
                "INSERT INTO trainer_routines (trainerId, id, studentId, name, goal, days, active, createdAt) " +
                    "VALUES ('t1', 'r1', 's1', 'Push', 'strength', 'monday', 1, NULL)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 19, true)

        db.query("SELECT name FROM trainer_routines WHERE id = 'r1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Push", it.getString(0))
        }
        for (table in listOf("trainer_templates", "trainer_templates_sync")) {
            db.query("SELECT COUNT(*) FROM $table").use {
                assertTrue(it.moveToFirst())
                assertEquals(0, it.getInt(0))
            }
        }
    }

    private companion object {
        const val DB = "migration-v19-test.db"
    }
}
