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

/** v20 (desafíos del entrenador, E14): suma las cuatro tablas de desafíos vacías y conserva las plantillas de la v19. */
@RunWith(AndroidJUnit4::class)
class MigrationV20Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra19a20ConservandoLasPlantillas() {
        helper.createDatabase(DB, 19).apply {
            execSQL(
                "INSERT INTO trainer_templates (trainerId, id, name, goal, level, days, exerciseCount, createdAt, structureJson) " +
                    "VALUES ('t1', 'tp1', 'Fuerza', NULL, NULL, 'monday', 3, NULL, NULL)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 20, true)

        db.query("SELECT name FROM trainer_templates WHERE id = 'tp1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Fuerza", it.getString(0))
        }
        val tables = listOf("trainer_challenges", "trainer_challenges_sync", "trainer_student_challenges", "trainer_student_challenges_sync")
        for (table in tables) {
            db.query("SELECT COUNT(*) FROM $table").use {
                assertTrue(it.moveToFirst())
                assertEquals(0, it.getInt(0))
            }
        }
    }

    private companion object {
        const val DB = "migration-v20-test.db"
    }
}
