package com.fittrainer.data.db

import androidx.room.Room
import androidx.room.testing.MigrationTestHelper
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Las bases de los usuarios se migran, nunca se borran: desde la cola offline (S3) Room guarda
 * registros pendientes de subir. Cada versión nueva suma su caso acá.
 */
@RunWith(AndroidJUnit4::class)
class FitTrainerDatabaseMigrationTest {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra1a2ConservandoLosDatos() {
        helper.createDatabase(DB, 1).apply {
            execSQL(
                "INSERT INTO health_snapshot (id, status, version, serverTimestamp, fetchedAt) " +
                    "VALUES (0, 'ok', '0.1.0', 't1', 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 2, true)

        db.query("SELECT version FROM health_snapshot WHERE id = 0").use {
            assertTrue(it.moveToFirst())
            assertEquals("0.1.0", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM routines").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }

    @Test fun migra2a3ConservandoLosDatos() {
        helper.createDatabase(DB, 2).apply {
            execSQL("INSERT INTO routines (id, name, goal, days, createdAt) VALUES ('rt-1', 'Rutina', NULL, 'monday', 1)")
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 3, true)

        db.query("SELECT name FROM routines WHERE id = 'rt-1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Rutina", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM library_exercises").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }

    @Test fun migra3a4ConservandoLosDatos() {
        helper.createDatabase(DB, 3).apply {
            execSQL("INSERT INTO routines (id, name, goal, days, createdAt) VALUES ('rt-1', 'Rutina', NULL, 'monday', 1)")
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 4, true)

        db.query("SELECT name FROM routines WHERE id = 'rt-1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Rutina", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM workout_sessions").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }

    @Test fun migra4a5DejandoLasSeriesPendientesDeSubir() {
        helper.createDatabase(DB, 4).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, " +
                    "syncState, currentPosition, currentSet, restEndsAt, restTotalSeconds, restPausedRemainingMs) " +
                    "VALUES ('w1', 'u1', 'rt-1', 'Push', 1, 2, 'FINISHED', 'PENDING', 0, 1, NULL, NULL, NULL)"
            )
            execSQL(
                "INSERT INTO workout_sets (id, sessionId, position, exerciseId, originalExerciseId, routineExerciseId, " +
                    "setNumber, actualKg, actualReps, executedAt) VALUES ('s1', 'w1', 0, 'ex-0', NULL, 're-0', 1, 40.0, 8, 2)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 5, true)

        db.query("SELECT actualKg, syncState, syncError FROM workout_sets WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals(40.0, it.getDouble(0), 0.0)
            assertEquals("PENDING", it.getString(1))
            assertTrue(it.isNull(2))
        }
    }

    @Test fun migra5a6ConservandoLosRechazosSinMarcarlosComoVistos() {
        helper.createDatabase(DB, 5).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, " +
                    "syncState, currentPosition, currentSet, restEndsAt, restTotalSeconds, restPausedRemainingMs) " +
                    "VALUES ('w1', 'u1', 'rt-1', 'Push', 1, 2, 'FINISHED', 'SYNCED', 0, 1, NULL, NULL, NULL)"
            )
            execSQL(
                "INSERT INTO workout_sets (id, sessionId, position, exerciseId, originalExerciseId, routineExerciseId, " +
                    "setNumber, actualKg, actualReps, executedAt, syncState, syncError) " +
                    "VALUES ('s1', 'w1', 0, 'ex-0', NULL, 're-0', 1, 40.0, 8, 2, 'FAILED', 'EXERCISE_NOT_FOUND')"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 6, true)

        db.query("SELECT s.syncError, s.failureSeen, w.failureSeen FROM workout_sets s JOIN workout_sessions w ON w.id = s.sessionId").use {
            assertTrue(it.moveToFirst())
            assertEquals("EXERCISE_NOT_FOUND", it.getString(0))
            assertEquals(0, it.getInt(1))
            assertEquals(0, it.getInt(2))
        }
    }

    @Test fun migra6a7ConElFeedbackVacioYElHistorialSinFilas() {
        helper.createDatabase(DB, 6).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, " +
                    "syncState, currentPosition, currentSet, failureSeen) " +
                    "VALUES ('w1', 'u1', 'rt-1', 'Push', 1, 2, 'FINISHED', 'SYNCED', 0, 1, 0)"
            )
            close()
        }
        val db = helper.runMigrationsAndValidate(DB, 7, true)
        db.query("SELECT rpe, notes, feedbackState FROM workout_sessions WHERE id = 'w1'").use {
            assertTrue(it.moveToFirst())
            assertTrue(it.isNull(0))
            assertTrue(it.isNull(1))
            assertEquals("NONE", it.getString(2))
        }
        db.query("SELECT COUNT(*) FROM history_sessions").use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
    }

    @Test fun migra7a8ConservandoElHistorialYConLaTablaDeLeidosVacia() {
        helper.createDatabase(DB, 7).apply {
            execSQL(
                "INSERT INTO history_sessions (id, ownerId, startedAt, hasModifications, sets, volumeKg, hasPr, inLatest, detailLoaded, trainerComment) " +
                    "VALUES ('h1', 'u1', 1, 0, 3, 300.0, 0, 1, 0, 'Bien')"
            )
            close()
        }
        val db = helper.runMigrationsAndValidate(DB, 8, true)
        db.query("SELECT trainerComment FROM history_sessions WHERE id = 'h1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Bien", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM history_comment_seen").use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
    }

    @Test fun migra8a9ConservandoElHistorialYConLasTablasDeProgresoVacias() {
        helper.createDatabase(DB, 8).apply {
            execSQL("INSERT INTO history_sessions (id, ownerId, startedAt, hasModifications, sets, volumeKg, hasPr, inLatest, detailLoaded) VALUES ('h1', 'u1', 1, 0, 3, 300.0, 0, 1, 1)")
            execSQL("INSERT INTO history_exercises (sessionId, position, exerciseName, isPr) VALUES ('h1', 0, 'Press', 0)")
            close()
        }
        val db = helper.runMigrationsAndValidate(DB, 9, true)
        db.query("SELECT exerciseName FROM history_exercises WHERE sessionId = 'h1'").use {
            assertTrue(it.moveToFirst()); assertEquals("Press", it.getString(0))
        }
        for (table in listOf("progress_exercise_points", "progress_exercise_meta", "progress_body_points", "progress_body_meta", "progress_exercises", "progress_exercises_meta")) {
            db.query("SELECT COUNT(*) FROM $table").use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
        }
    }

    // La base real (la del DatabaseModule, sin borrado destructivo) abre una v1 existente.
    @Test fun laBaseRealAbreUnaV1Existente() {
        helper.createDatabase(DB, 1).close()

        val db = Room.databaseBuilder(
            ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java, DB,
        ).build()
        db.openHelper.writableDatabase.query("SELECT COUNT(*) FROM library_sync").use {
            assertTrue(it.moveToFirst())
        }
        db.close()
    }

    private companion object {
        const val DB = "migration-test.db"
    }
}
