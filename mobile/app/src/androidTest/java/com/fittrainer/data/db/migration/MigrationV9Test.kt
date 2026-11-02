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

/** v9 (descanso ajustable): las series y ejercicios guardados quedan con el descanso nulo, sin perder nada. */
@RunWith(AndroidJUnit4::class)
class MigrationV9Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra8a9ConLosDescansosNulos() {
        helper.createDatabase(DB, 8).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, " +
                    "syncState, currentPosition, currentSet, restEndsAt, restTotalSeconds, restPausedRemainingMs) " +
                    "VALUES ('w1', 'u1', 'rt-1', 'Push', 1, 2, 'FINISHED', 'PENDING', 0, 1, NULL, NULL, NULL)"
            )
            execSQL(
                "INSERT INTO workout_exercises (sessionId, position, routineExerciseId, exerciseId, originalExerciseId, " +
                    "name, muscleGroup, equipment, description, videoUrl, sets, reps, restSeconds, suggestedKg) " +
                    "VALUES ('w1', 0, 're-0', 'ex-0', NULL, 'Press', NULL, NULL, NULL, NULL, 4, 10, 90, 40.0)"
            )
            execSQL(
                "INSERT INTO workout_sets (id, sessionId, position, exerciseId, originalExerciseId, routineExerciseId, " +
                    "setNumber, actualKg, actualReps, executedAt) VALUES ('s1', 'w1', 0, 'ex-0', NULL, 're-0', 1, 40.0, 8, 2)"
            )
            execSQL(
                "INSERT INTO history_sessions (id, ownerId, startedAt, hasModifications, sets, volumeKg, hasPr, inLatest, detailLoaded) " +
                    "VALUES ('h1', 'u1', 1, 0, 1, 320.0, 0, 1, 1)"
            )
            execSQL(
                "INSERT INTO history_sets (id, sessionId, exercisePosition, setNumber, reps, kg, executedAt) " +
                    "VALUES ('hs1', 'h1', 0, 1, 8, 40.0, 2)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 9, true)

        db.query("SELECT restSeconds, restOverrideSeconds FROM workout_exercises WHERE sessionId = 'w1'").use {
            assertTrue(it.moveToFirst())
            assertEquals(90, it.getInt(0))
            assertTrue(it.isNull(1))
        }
        db.query("SELECT actualKg, syncState, restSeconds FROM workout_sets WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals(40.0, it.getDouble(0), 0.0)
            assertEquals("PENDING", it.getString(1))
            assertTrue(it.isNull(2))
        }
        db.query("SELECT restSeconds FROM history_sets WHERE id = 'hs1'").use {
            assertTrue(it.moveToFirst())
            assertTrue(it.isNull(0))
        }
    }

    private companion object {
        const val DB = "migration-v9-test.db"
    }
}
