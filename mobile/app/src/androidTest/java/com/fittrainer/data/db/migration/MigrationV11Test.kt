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

/** v11 (notificaciones, tarjeta 17): las tablas de avisos arrancan vacías y el resto queda intacto. */
@RunWith(AndroidJUnit4::class)
class MigrationV11Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra10a11ConLaTablaDeNotificacionesVaciaYLosDatosIntactos() {
        helper.createDatabase(DB, 10).apply {
            execSQL("INSERT INTO history_sessions (id, ownerId, startedAt, hasModifications, sets, volumeKg, hasPr, inLatest, detailLoaded) VALUES ('h1', 'u1', 1, 0, 3, 300.0, 0, 1, 1)")
            close()
        }
        val db = helper.runMigrationsAndValidate(DB, 11, true)
        db.query("SELECT COUNT(*) FROM notifications").use { assertTrue(it.moveToFirst()); assertEquals(0, it.getInt(0)) }
        db.query("SELECT COUNT(*) FROM notifications_meta").use { assertTrue(it.moveToFirst()); assertEquals(0, it.getInt(0)) }
        db.query("SELECT COUNT(*) FROM notification_pending_reads").use { assertTrue(it.moveToFirst()); assertEquals(0, it.getInt(0)) }
        // La tabla de pendientes nueva acepta una lectura de una notificación que no está guardada.
        db.execSQL("INSERT INTO notification_pending_reads (ownerId, notificationId) VALUES ('u1', 'n1')")
        db.query("SELECT notificationId FROM notification_pending_reads").use { assertTrue(it.moveToFirst()); assertEquals("n1", it.getString(0)) }
        db.query("SELECT sets FROM history_sessions WHERE id = 'h1'").use { assertTrue(it.moveToFirst()); assertEquals(3, it.getInt(0)) }
    }

    private companion object {
        const val DB = "migration-v11-test.db"
    }
}
