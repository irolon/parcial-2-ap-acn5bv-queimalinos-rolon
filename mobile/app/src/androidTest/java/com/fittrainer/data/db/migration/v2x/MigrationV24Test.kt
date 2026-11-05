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

/** v24 (tarjeta 16): suma las tablas de los turnos del alumno, vacías, y conserva la agenda del PT y lo pendiente de la v23. */
@RunWith(AndroidJUnit4::class)
class MigrationV24Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra23a24ConservandoLosDatos() {
        helper.createDatabase(DB, 23).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, syncState, " +
                    "currentPosition, currentSet) VALUES ('s1', 'u1', NULL, 'Libre', 1, 2, 'FINISHED', 'PENDING', 0, 1)"
            )
            execSQL(
                "INSERT INTO trainer_appointments (trainerId, id, studentId, studentName, studentAvatarUrl, scheduledAt, status, " +
                    "notes, createdAt) VALUES ('t1', 'a1', 's1', 'Lucía', NULL, 5, 'pending', 'hola', 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 24, true)

        db.query("SELECT status, notes FROM trainer_appointments WHERE id = 'a1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("pending", it.getString(0))
            assertEquals("hola", it.getString(1))
        }
        db.query("SELECT syncState FROM workout_sessions WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("PENDING", it.getString(0))
        }
        for (table in listOf("student_appointments", "student_appointments_sync", "student_free_slots", "student_free_slots_sync")) {
            db.query("SELECT COUNT(*) FROM $table").use {
                assertTrue(it.moveToFirst())
                assertEquals(0, it.getInt(0))
            }
        }
    }

    private companion object {
        const val DB = "migration-v24-test.db"
    }
}
