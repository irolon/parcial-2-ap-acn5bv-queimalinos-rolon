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

/**
 * v12 (lista de alumnos del entrenador): suma trainer_students y trainer_students_sync vacías, sin tocar
 * lo del alumno. Migra desde la 11 (la #44 es la v10 y la #48, la v11).
 */
@RunWith(AndroidJUnit4::class)
class MigrationV12Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra11a12ConLasTablasDelEntrenadorVacias() {
        helper.createDatabase(DB, 11).apply {
            execSQL(
                "INSERT INTO history_sessions (id, ownerId, startedAt, hasModifications, sets, volumeKg, hasPr, inLatest, detailLoaded) " +
                    "VALUES ('h1', 'u1', 1, 0, 1, 320.0, 0, 1, 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 12, true)

        db.query("SELECT COUNT(*) FROM trainer_students").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
        db.query("SELECT COUNT(*) FROM trainer_students_sync").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
        db.query("SELECT volumeKg FROM history_sessions WHERE id = 'h1'").use {
            assertTrue(it.moveToFirst())
            assertEquals(320.0, it.getDouble(0), 0.0)
        }
    }

    private companion object {
        const val DB = "migration-v12-test.db"
    }
}
