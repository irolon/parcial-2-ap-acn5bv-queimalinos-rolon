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

/** v30 (fotos de perfil): el hilo del chat y la ficha del alumno suman la foto, y lo que había queda con null. */
@RunWith(AndroidJUnit4::class)
class MigrationV30Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra29a30ConLasFotosEnNull() {
        helper.createDatabase(DB, 29).apply {
            execSQL(
                "INSERT INTO trainer_message_threads (trainerId, studentId, counterpartName, nextBefore, fetchedAt) " +
                    "VALUES ('t1', 's1', 'Ana', NULL, 1)"
            )
            execSQL(
                "INSERT INTO trainer_student_details (trainerId, id, name, email, goal, level, birthDate, active, " +
                    "gymEquipmentJson, injuries, createdAt, lastSessionAt, metricWeightKg, metricHeightCm, " +
                    "metricBodyFatPct, metricBmi, metricRecordedAt, activeRoutineName, activeRoutineDays, fetchedAt) " +
                    "VALUES ('t1', 's1', 'Ana', 'ana@mail.com', NULL, NULL, NULL, 1, '[]', NULL, 1, NULL, NULL, NULL, " +
                    "NULL, NULL, NULL, NULL, NULL, 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 30, true)

        db.query("SELECT counterpartName, counterpartAvatarUrl FROM trainer_message_threads WHERE studentId = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Ana", it.getString(0))
            assertTrue(it.isNull(1))
        }
        db.query("SELECT name, avatarUrl FROM trainer_student_details WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Ana", it.getString(0))
            assertTrue(it.isNull(1))
        }
    }

    private companion object {
        const val DB = "migration-v30-test.db"
    }
}
