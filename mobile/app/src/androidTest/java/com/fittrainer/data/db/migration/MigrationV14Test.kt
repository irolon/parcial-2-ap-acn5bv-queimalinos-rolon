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

/** v14 (historial del alumno para el entrenador, E4): suma trainer_sessions y trainer_sessions_sync vacías. */
@RunWith(AndroidJUnit4::class)
class MigrationV14Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra13a14ConservandoLaFicha() {
        helper.createDatabase(DB, 13).apply {
            execSQL(
                "INSERT INTO trainer_student_details (trainerId, id, name, email, goal, level, birthDate, active, gymEquipmentJson, " +
                    "injuries, createdAt, lastSessionAt, metricWeightKg, metricHeightCm, metricBodyFatPct, metricBmi, metricRecordedAt, " +
                    "activeRoutineName, activeRoutineDays, fetchedAt) " +
                    "VALUES ('t1', 's1', 'Ana', 'a@mail.com', NULL, NULL, NULL, 1, '[]', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 14, true)

        db.query("SELECT name FROM trainer_student_details WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Ana", it.getString(0))
        }
        for (table in listOf("trainer_sessions", "trainer_sessions_sync")) {
            db.query("SELECT COUNT(*) FROM $table").use {
                assertTrue(it.moveToFirst())
                assertEquals(0, it.getInt(0))
            }
        }
    }

    private companion object {
        const val DB = "migration-v14-test.db"
    }
}
