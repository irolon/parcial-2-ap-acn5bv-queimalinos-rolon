package com.fittrainer.ui.sync.uploadstatus

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.testing.fakes.sync.pendingSet
import com.fittrainer.ui.sync.ManualUpload
import com.fittrainer.ui.sync.UploadStatusViewModel
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

/** "Subir ahora" del aviso de Hoy y cuándo se limpia su resultado. */
class UploadStatusUploadNowTest : UploadStatusTestBase() {

    // Pablo #32 punto 1: forzar la subida a mano desde Hoy.
    @Test fun `subir ahora con red sube y muestra Subido un rato`() = runTest {
        pendingW1()
        sync.onSyncNow = { dao.setSyncState("w1", SYNC_SYNCED) }

        vm.uploadNow()

        assertEquals(1, sync.syncNowCalls)
        assertEquals(ManualUpload.DONE, vm.manual.value)
        advanceTimeBy(UploadStatusViewModel.DONE_VISIBLE_MS + 1)
        assertEquals(ManualUpload.IDLE, vm.manual.value)
    }

    @Test fun `subir ahora sin red avisa enseguida sin forzar la pasada`() = runTest {
        pendingW1()
        connectivity.state.value = false

        vm.uploadNow()

        assertEquals(0, sync.syncNowCalls)
        assertEquals(ManualUpload.FAILED, vm.manual.value)
    }

    // Codex ronda 4: una sesión rechazada deja de estar pendiente, pero no es un éxito.
    @Test fun `si el servidor rechaza la sesion no muestra Subido`() = runTest {
        pendingW1()
        sync.onSyncNow = { dao.setSyncState("w1", SYNC_FAILED) }

        vm.uploadNow()

        assertEquals(ManualUpload.REJECTED, vm.manual.value)
    }

    @Test fun `si el servidor rechaza una serie tampoco muestra Subido`() = runTest {
        pendingW1()
        dao.state.value = dao.state.value.copy(sets = listOf(pendingSet("s1")))
        sync.onSyncNow = {
            dao.applyUpload("w1", synced = emptyList(), failed = mapOf("s1" to "EXERCISE_NOT_FOUND"), rejected = false)
        }

        vm.uploadNow()

        assertEquals(ManualUpload.REJECTED, vm.manual.value)
    }

    @Test fun `si la pasada termina y sigue pendiente queda FAILED`() = runTest {
        pendingW1()

        vm.uploadNow()

        assertEquals(ManualUpload.FAILED, vm.manual.value)
    }

    // Pablo #32 ronda 2, punto 2: pasado el tope no "falló", sigue subiendo.
    @Test fun `si la pasada no termina en el tope sigue en segundo plano`() = runTest {
        pendingW1()
        sync.syncNowResult = false

        vm.uploadNow()

        assertEquals(ManualUpload.IN_BACKGROUND, vm.manual.value)
    }

    // Pablo #32 ronda 2, punto 2: el resultado ya no queda pegado para la próxima sesión.
    @Test fun `el resultado se limpia cuando cambian las pendientes`() = runTest {
        pendingW1()
        connectivity.state.value = false
        vm.uploadNow()
        assertEquals(ManualUpload.FAILED, vm.manual.value)

        dao.setSyncState("w1", SYNC_SYNCED) // WorkManager subió solo
        assertEquals(ManualUpload.IDLE, vm.manual.value)

        finishW2()
        assertEquals(ManualUpload.IDLE, vm.manual.value)
    }

    // Codex: el FAILED de una excepción también quedaba pegado para la próxima sesión.
    @Test fun `si syncNow tira una excepcion el FAILED tambien se limpia`() = runTest {
        pendingW1()
        sync.onSyncNow = { throw IllegalStateException("boom") }
        vm.uploadNow()
        assertEquals(ManualUpload.FAILED, vm.manual.value)

        dao.setSyncState("w1", SYNC_SYNCED) // WorkManager subió solo
        finishW2()

        assertEquals(ManualUpload.IDLE, vm.manual.value)
    }

    @Test fun `el rechazo tambien se limpia con una sesion nueva`() = runTest {
        pendingW1()
        sync.onSyncNow = { dao.setSyncState("w1", SYNC_FAILED) }
        vm.uploadNow()
        assertEquals(ManualUpload.REJECTED, vm.manual.value)

        finishW2()

        assertEquals(ManualUpload.IDLE, vm.manual.value)
    }

    @Test fun `un segundo toque mientras sube no fuerza otra pasada`() = runTest {
        pendingW1()
        val gate = CompletableDeferred<Unit>()
        sync.onSyncNow = { gate.await() }

        vm.uploadNow()
        vm.uploadNow()
        assertEquals(ManualUpload.UPLOADING, vm.manual.value)
        gate.complete(Unit)

        assertEquals(1, sync.syncNowCalls)
    }
}
