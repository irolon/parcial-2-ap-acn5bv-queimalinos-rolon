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

/** v25 (tarjeta 14): suma ai_chat_messages vacía y conserva los turnos del alumno y lo pendiente de la v24. */
@RunWith(AndroidJUnit4::class)
class MigrationV25Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra24a25ConservandoLosDatos() {
        helper.createDatabase(DB, 24).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, syncState, " +
                    "currentPosition, currentSet) VALUES ('s1', 'u1', NULL, 'Libre', 1, 2, 'FINISHED', 'PENDING', 0, 1)"
            )
            execSQL(
                "INSERT INTO student_appointments (studentId, id, trainerId, scheduledAt, status, notes, createdAt) " +
                    "VALUES ('u1', 'a1', 't1', 5, 'pending', 'hola', 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 25, true)

        db.query("SELECT status, notes FROM student_appointments WHERE id = 'a1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("pending", it.getString(0))
            assertEquals("hola", it.getString(1))
        }
        db.query("SELECT syncState FROM workout_sessions WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("PENDING", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM ai_chat_messages").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }

    private companion object {
        const val DB = "migration-v25-test.db"
    }
}
