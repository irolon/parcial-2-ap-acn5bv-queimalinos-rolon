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

/** v18 (rutinas del alumno para el entrenador, E8): suma las tablas de rutinas y catálogo vacías y conserva el Inicio de la v17. */
@RunWith(AndroidJUnit4::class)
class MigrationV18Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra17a18ConservandoElInicio() {
        helper.createDatabase(DB, 17).apply {
            execSQL("INSERT INTO trainer_overview (trainerId, dataJson, fetchedAt) VALUES ('t1', '{}', 5)")
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 18, true)

        db.query("SELECT fetchedAt FROM trainer_overview WHERE trainerId = 't1'").use {
            assertTrue(it.moveToFirst())
            assertEquals(5L, it.getLong(0))
        }
        for (table in listOf("trainer_routines", "trainer_routine_exercises", "trainer_routines_sync", "trainer_exercises")) {
            db.query("SELECT COUNT(*) FROM $table").use {
                assertTrue(it.moveToFirst())
                assertEquals(0, it.getInt(0))
            }
        }
    }

    private companion object {
        const val DB = "migration-v18-test.db"
    }
}
