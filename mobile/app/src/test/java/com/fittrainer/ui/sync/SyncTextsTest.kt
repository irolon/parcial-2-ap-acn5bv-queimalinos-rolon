package com.fittrainer.ui.sync

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SyncTextsTest {

    @Test fun `linea del resumen segun el estado`() {
        assertNull(sessionUploadText(null))
        assertEquals("Guardado en el celular · se sube cuando haya conexión", sessionUploadText(SessionUploadRow(SYNC_PENDING, 0)))
        assertEquals("Subido ✓", sessionUploadText(SessionUploadRow(SYNC_SYNCED, 0)))
        assertEquals("Subido · 1 serie no se pudo subir", sessionUploadText(SessionUploadRow(SYNC_SYNCED, 1)))
        assertEquals("Subido · 3 series no se pudieron subir", sessionUploadText(SessionUploadRow(SYNC_SYNCED, 3)))
        assertEquals("No se pudo subir este entrenamiento", sessionUploadText(SessionUploadRow(SYNC_FAILED, 0)))
    }

    @Test fun `aviso de Hoy solo si hay algo`() {
        assertNull(pendingUploadsText(UploadCounts(0, 0)))
        assertEquals("1 entrenamiento sin subir", pendingUploadsText(UploadCounts(1, 0)))
        assertEquals("2 entrenamientos sin subir", pendingUploadsText(UploadCounts(2, 0)))
        assertEquals(
            "2 entrenamientos sin subir · 1 entrenamiento no se pudo subir",
            pendingUploadsText(UploadCounts(2, 1)),
        )
        assertEquals("3 entrenamientos no se pudieron subir", pendingUploadsText(UploadCounts(0, 3)))
        // Una sesión subida con series rechazadas también avisa (spec §2: "pendiente o fallido").
        assertEquals("1 serie no se pudo subir", pendingUploadsText(UploadCounts(failedSets = 1)))
        assertEquals(
            "1 entrenamiento sin subir · 2 series no se pudieron subir",
            pendingUploadsText(UploadCounts(pending = 1, failedSets = 2)),
        )
    }

    @Test fun `aviso del logout`() {
        assertEquals("Tenés 1 entrenamiento sin subir. Se va a subir cuando vuelvas a entrar.", signOutPendingText(1))
        assertEquals("Tenés 2 entrenamientos sin subir. Se van a subir cuando vuelvas a entrar.", signOutPendingText(2))
    }
}
