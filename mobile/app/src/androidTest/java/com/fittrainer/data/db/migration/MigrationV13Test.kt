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

/** v13 (ficha del alumno, E3): suma trainer_student_details vacía y conserva la lista de alumnos de la v12. */
@RunWith(AndroidJUnit4::class)
class MigrationV13Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra12a13ConservandoLaListaDeAlumnos() {
        helper.createDatabase(DB, 12).apply {
            execSQL(
                "INSERT INTO trainer_students (id, trainerId, name, email, goal, active, avatarUrl, createdAt, lastSessionAt, " +
                    "daysPerWeek, adherenceAssigned, adherenceDone, adherencePct) " +
                    "VALUES ('s1', 't1', 'Ana', 'a@mail.com', NULL, 1, NULL, 1, NULL, 0, NULL, NULL, NULL)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 13, true)

        db.query("SELECT name FROM trainer_students WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Ana", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM trainer_student_details").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }

    private companion object {
        const val DB = "migration-v13-test.db"
    }
}
