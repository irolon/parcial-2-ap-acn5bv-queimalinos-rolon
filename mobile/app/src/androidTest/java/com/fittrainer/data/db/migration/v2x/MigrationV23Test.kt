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

/** v23 (E13): suma las tablas de la agenda del entrenador, vacías, y conserva los mensajes y lo pendiente de la v22. */
@RunWith(AndroidJUnit4::class)
class MigrationV23Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra22a23ConservandoLosDatos() {
        helper.createDatabase(DB, 22).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, syncState, " +
                    "currentPosition, currentSet) VALUES ('s1', 'u1', NULL, 'Libre', 1, 2, 'FINISHED', 'PENDING', 0, 1)"
            )
            execSQL(
                "INSERT INTO trainer_messages (trainerId, id, studentId, senderRole, body, imageUrl, broadcastId, readAt, " +
                    "createdAt, fetchedAt, hasImage) VALUES ('t1', 'm1', 's1', 'student', 'hola', NULL, NULL, NULL, 1, 1, 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 23, true)

        db.query("SELECT body, hasImage FROM trainer_messages WHERE id = 'm1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("hola", it.getString(0))
            assertEquals(1, it.getInt(1))
        }
        db.query("SELECT syncState FROM workout_sessions WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("PENDING", it.getString(0))
        }
        for (table in listOf("trainer_appointments", "trainer_agenda_weeks", "trainer_availability", "trainer_availability_sync")) {
            db.query("SELECT COUNT(*) FROM $table").use {
                assertTrue(it.moveToFirst())
                assertEquals(0, it.getInt(0))
            }
        }
    }

    private companion object {
        const val DB = "migration-v23-test.db"
    }
}
