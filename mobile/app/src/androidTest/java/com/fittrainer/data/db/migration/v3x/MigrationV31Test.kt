package com.fittrainer.data.db.migration.v3x

import androidx.room.testing.MigrationTestHelper
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.fittrainer.data.db.FitTrainerDatabase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** v31 (#123): la ficha del alumno suma la frecuencia semanal, y lo que había queda con null. */
@RunWith(AndroidJUnit4::class)
class MigrationV31Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra30a31ConLaFrecuenciaEnNull() {
        helper.createDatabase(DB, 30).apply {
            execSQL(
                "INSERT INTO trainer_student_details (trainerId, id, name, email, goal, level, birthDate, active, " +
                    "gymEquipmentJson, injuries, createdAt, lastSessionAt, metricWeightKg, metricHeightCm, " +
                    "metricBodyFatPct, metricBmi, metricRecordedAt, activeRoutineName, activeRoutineDays, fetchedAt, avatarUrl) " +
                    "VALUES ('t1', 's1', 'Ana', 'ana@mail.com', NULL, NULL, NULL, 1, '[]', NULL, 1, NULL, NULL, NULL, " +
                    "NULL, NULL, NULL, NULL, NULL, 1, 'https://firmada')"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 31, true)

        db.query("SELECT name, avatarUrl, weeklyFrequency FROM trainer_student_details WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Ana", it.getString(0))
            assertEquals("https://firmada", it.getString(1))
            assertTrue(it.isNull(2))
        }
    }

    private companion object {
        const val DB = "migration-v31-test.db"
    }
}
