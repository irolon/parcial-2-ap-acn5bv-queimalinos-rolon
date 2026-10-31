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

    @Test fun `Subir ahora solo con pendientes y el resultado en el aviso`() {
        assertNull(uploadsNoticeUi(UploadCounts(), ManualUpload.IDLE))
        assertEquals(
            UploadsNoticeUi("1 entrenamiento sin subir", canUpload = true, uploading = false),
            uploadsNoticeUi(UploadCounts(pending = 1), ManualUpload.IDLE),
        )
        assertEquals(true, uploadsNoticeUi(UploadCounts(pending = 1), ManualUpload.UPLOADING)?.uploading)
        assertEquals(false, uploadsNoticeUi(UploadCounts(failed = 1), ManualUpload.IDLE)?.canUpload)
        // La X para descartar solo con rechazos (sesiones o series).
        assertEquals(false, uploadsNoticeUi(UploadCounts(pending = 1), ManualUpload.IDLE)?.canDismiss)
        assertEquals(true, uploadsNoticeUi(UploadCounts(failed = 1), ManualUpload.IDLE)?.canDismiss)
        assertEquals(true, uploadsNoticeUi(UploadCounts(failedSets = 2), ManualUpload.IDLE)?.canDismiss)
        assertEquals(
            "1 entrenamiento sin subir · No se pudo subir, se reintenta solo cuando haya conexión",
            uploadsNoticeUi(UploadCounts(pending = 1), ManualUpload.FAILED)?.text,
        )
        assertEquals(
            "1 entrenamiento sin subir · Sigue subiendo en segundo plano",
            uploadsNoticeUi(UploadCounts(pending = 1), ManualUpload.IN_BACKGROUND)?.text,
        )
        assertEquals("Subido ✓", uploadsNoticeUi(UploadCounts(), ManualUpload.DONE)?.text)
        // Con un rechazo nuevo no hay "Subido ✓": queda el aviso del rechazo.
        assertEquals("1 entrenamiento no se pudo subir", uploadsNoticeUi(UploadCounts(failed = 1), ManualUpload.REJECTED)?.text)
    }

    @Test fun `aviso del logout`() {
        assertEquals("Tenés 1 entrenamiento sin subir. Se va a subir cuando vuelvas a entrar.", signOutPendingText(1))
        assertEquals("Tenés 2 entrenamientos sin subir. Se van a subir cuando vuelvas a entrar.", signOutPendingText(2))
    }

    @Test fun `aviso del logout con solo comentarios post-entreno`() {
        assertEquals("Tenés 1 comentario post-entreno sin subir. Se va a subir cuando vuelvas a entrar.", signOutPendingText(0, 1))
        assertEquals("Tenés 3 comentarios post-entreno sin subir. Se van a subir cuando vuelvas a entrar.", signOutPendingText(0, 3))
    }

    @Test fun `aviso del logout con entrenamientos y comentarios`() {
        assertEquals(
            "Tenés 1 entrenamiento y 2 comentarios post-entreno sin subir. Se van a subir cuando vuelvas a entrar.",
            signOutPendingText(1, 2),
        )
        assertEquals(
            "Tenés 2 entrenamientos y 1 comentario post-entreno sin subir. Se van a subir cuando vuelvas a entrar.",
            signOutPendingText(2, 1),
        )
    }
}
