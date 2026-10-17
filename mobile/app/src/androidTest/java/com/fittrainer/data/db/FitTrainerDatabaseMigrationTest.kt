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

    // La base real (la del DatabaseModule, sin borrado destructivo) abre una v1 existente.
    @Test fun laBaseRealAbreUnaV1Existente() {
        helper.createDatabase(DB, 1).close()

        val db = Room.databaseBuilder(
            ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java, DB,
        ).build()
        db.openHelper.writableDatabase.query("SELECT COUNT(*) FROM routine_sync").use {
            assertTrue(it.moveToFirst())
        }
        db.close()
    }

    private companion object {
        const val DB = "migration-test.db"
    }
}
