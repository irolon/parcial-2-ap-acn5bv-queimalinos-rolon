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

/** v21 (mensajes del entrenador, E11): suma las cuatro tablas de mensajes vacías y conserva lo pendiente de la v20. */
@RunWith(AndroidJUnit4::class)
class MigrationV21Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra20a21ConservandoLoPendiente() {
        helper.createDatabase(DB, 20).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, syncState, " +
                    "currentPosition, currentSet) VALUES ('s1', 'u1', NULL, 'Libre', 1, 2, 'FINISHED', 'PENDING', 0, 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 21, true)

        db.query("SELECT syncState FROM workout_sessions WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("PENDING", it.getString(0))
        }
        for (table in listOf("trainer_conversations", "trainer_conversations_sync", "trainer_messages", "trainer_message_threads")) {
            db.query("SELECT COUNT(*) FROM $table").use {
                assertTrue(it.moveToFirst())
                assertEquals(0, it.getInt(0))
            }
        }
    }

    private companion object {
        const val DB = "migration-v21-test.db"
    }
}
