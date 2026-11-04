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

/** v22 (#73): suma has_image a los mensajes con 0 por defecto y conserva los mensajes y lo pendiente de la v21. */
@RunWith(AndroidJUnit4::class)
class MigrationV22Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra21a22ConservandoLosMensajes() {
        helper.createDatabase(DB, 21).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, syncState, " +
                    "currentPosition, currentSet) VALUES ('s1', 'u1', NULL, 'Libre', 1, 2, 'FINISHED', 'PENDING', 0, 1)"
            )
            execSQL(
                "INSERT INTO trainer_messages (trainerId, id, studentId, senderRole, body, imageUrl, broadcastId, readAt, " +
                    "createdAt, fetchedAt) VALUES ('t1', 'm1', 's1', 'student', 'hola', NULL, NULL, NULL, 1, 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 22, true)

        db.query("SELECT body, hasImage FROM trainer_messages WHERE id = 'm1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("hola", it.getString(0))
            assertEquals(0, it.getInt(1))
        }
        db.query("SELECT syncState FROM workout_sessions WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("PENDING", it.getString(0))
        }
    }

    private companion object {
        const val DB = "migration-v22-test.db"
    }
}
