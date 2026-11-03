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

/** v17 (Inicio del entrenador, E7): suma trainer_overview vacía y conserva las medidas de la v16. */
@RunWith(AndroidJUnit4::class)
class MigrationV17Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra16a17ConservandoLasMedidas() {
        helper.createDatabase(DB, 16).apply {
            execSQL(
                "INSERT INTO trainer_student_metrics (trainerId, id, studentId, recordedAt, weightKg, heightCm, bodyFatPct, " +
                    "waistCm, hipCm, chestCm, bmi, recordedBy) VALUES ('t1', 'm1', 's1', 1, 80.5, NULL, NULL, 82.0, NULL, NULL, NULL, 'trainer')"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 17, true)

        db.query("SELECT weightKg FROM trainer_student_metrics WHERE id = 'm1'").use {
            assertTrue(it.moveToFirst())
            assertEquals(80.5, it.getDouble(0), 0.0)
        }
        db.query("SELECT COUNT(*) FROM trainer_overview").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }

    private companion object {
        const val DB = "migration-v17-test.db"
    }
}
