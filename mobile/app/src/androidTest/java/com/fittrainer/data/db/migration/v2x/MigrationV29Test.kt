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

/** v29 (Perfil y Más): suma la tabla my_profile, vacía, y no toca lo que había. */
@RunWith(AndroidJUnit4::class)
class MigrationV29Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra28a29ConMyProfileVacia() {
        helper.createDatabase(DB, 28).apply {
            execSQL(
                "INSERT INTO trainer_students (id, trainerId, name, email, goal, active, avatarUrl, createdAt, " +
                    "lastSessionAt, daysPerWeek, adherenceAssigned, adherenceDone, adherencePct, openSessionStartedAt) " +
                    "VALUES ('s1', 't1', 'Ana', 'ana@mail.com', NULL, 1, NULL, 1, NULL, 3, 3, 2, 67, NULL)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 29, true)

        db.query("SELECT name FROM trainer_students WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Ana", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM my_profile").use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
        // Teléfono, foto y título aceptan null (el PT no tiene foto; el alumno, título).
        db.execSQL(
            "INSERT INTO my_profile (ownerId, role, name, email, phone, avatarUrl, professionalTitle, fetchedAt) " +
                "VALUES ('u1', 'STUDENT', 'Ana', 'ana@mail.com', NULL, NULL, NULL, 1)"
        )
        db.query("SELECT name FROM my_profile WHERE ownerId = 'u1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Ana", it.getString(0))
        }
    }

    private companion object {
        const val DB = "migration-v29-test.db"
    }
}
