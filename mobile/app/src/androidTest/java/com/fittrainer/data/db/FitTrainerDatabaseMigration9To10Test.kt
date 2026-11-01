package com.fittrainer.data.db

import androidx.room.testing.MigrationTestHelper
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Migración 9 -> 10 (tarjeta 17), aparte de FitTrainerDatabaseMigrationTest para no pasar las 200 líneas. */
@RunWith(AndroidJUnit4::class)
class FitTrainerDatabaseMigration9To10Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra9a10ConLaTablaDeNotificacionesVaciaYLosDatosIntactos() {
        helper.createDatabase(DB, 9).apply {
            execSQL("INSERT INTO history_sessions (id, ownerId, startedAt, hasModifications, sets, volumeKg, hasPr, inLatest, detailLoaded) VALUES ('h1', 'u1', 1, 0, 3, 300.0, 0, 1, 1)")
            close()
        }
        val db = helper.runMigrationsAndValidate(DB, 10, true)
        db.query("SELECT COUNT(*) FROM notifications").use { assertTrue(it.moveToFirst()); assertEquals(0, it.getInt(0)) }
        db.query("SELECT COUNT(*) FROM notifications_meta").use { assertTrue(it.moveToFirst()); assertEquals(0, it.getInt(0)) }
        db.query("SELECT COUNT(*) FROM notification_pending_reads").use { assertTrue(it.moveToFirst()); assertEquals(0, it.getInt(0)) }
        // La tabla de pendientes nueva acepta una lectura de una notificación que no está guardada.
        db.execSQL("INSERT INTO notification_pending_reads (ownerId, notificationId) VALUES ('u1', 'n1')")
        db.query("SELECT notificationId FROM notification_pending_reads").use { assertTrue(it.moveToFirst()); assertEquals("n1", it.getString(0)) }
        db.query("SELECT sets FROM history_sessions WHERE id = 'h1'").use { assertTrue(it.moveToFirst()); assertEquals(3, it.getInt(0)) }
    }

    private companion object {
        const val DB = "migration-9-10-test.db"
    }
}
