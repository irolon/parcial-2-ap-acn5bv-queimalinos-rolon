package com.fittrainer.ui.sync

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.session.Session
import com.fittrainer.data.sync.UploadStatusRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionSync
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.pendingSet
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class UploadStatusViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val session = FakeStudentSession()
    private val sync = FakeSessionSync()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val vm by lazy { UploadStatusViewModel(session, UploadStatusRepository(dao), sync, connectivity) }

    private fun pendingW1() {
        dao.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession("w1")))
    }

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

    @Test fun `si despues de la pasada sigue pendiente queda FAILED`() = runTest {
        pendingW1()
        sync.syncNowResult = false

        vm.uploadNow()

        assertEquals(ManualUpload.FAILED, vm.manual.value)
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

    @Test fun `cuenta pendientes y fallidas del alumno logueado`() = runTest {
        dao.state.value = FakeWorkoutDao.State(
            sessions = listOf(
                finishedSession("w1"),
                finishedSession("w2", syncState = SYNC_FAILED),
                finishedSession("ajena", owner = "u2"),
            ).associateBy { it.id },
        )
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.counts.collect {} }

        assertEquals(UploadCounts(pending = 1, failed = 1), vm.counts.value)

        session.session.value = Session.LoggedOut
        assertEquals(UploadCounts(), vm.counts.value)
    }

    @Test fun `cuenta las series rechazadas de sesiones ya subidas`() = runTest {
        dao.state.value = FakeWorkoutDao.State(
            sessions = mapOf("w1" to finishedSession("w1", syncState = SYNC_SYNCED)),
            sets = listOf(
                pendingSet("s1").copy(syncState = SYNC_FAILED, syncError = "EXERCISE_NOT_FOUND"),
                pendingSet("s2", setNumber = 2).copy(syncState = SYNC_SYNCED),
            ),
        )
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.counts.collect {} }

        assertEquals(UploadCounts(failedSets = 1), vm.counts.value)
    }

    // Pablo #32 punto 9: el aviso de rechazos ya no queda para siempre.
    @Test fun `descartar los rechazos los saca del aviso`() = runTest {
        dao.state.value = FakeWorkoutDao.State(
            sessions = listOf(finishedSession("w1"), finishedSession("w2", syncState = SYNC_FAILED)).associateBy { it.id },
        )
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.counts.collect {} }
        assertEquals(UploadCounts(pending = 1, failed = 1), vm.counts.value)

        vm.dismissFailures()

        assertEquals(UploadCounts(pending = 1), vm.counts.value)
    }

    @Test fun `estado de una sesion`() = runTest {
        dao.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession("w1")))

        assertEquals("PENDING", vm.session("w1").first()?.syncState)
    }
}
