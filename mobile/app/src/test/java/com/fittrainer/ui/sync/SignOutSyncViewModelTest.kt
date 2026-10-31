package com.fittrainer.ui.sync

import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.sync.ManualSync
import com.fittrainer.data.sync.UploadStatusRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionSync
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class SignOutSyncViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val sync = FakeSessionSync()
    private val online = FakeConnectivityObserver(online = true)
    private val vm by lazy { SignOutSyncViewModel(FakeStudentSession(), UploadStatusRepository(dao), ManualSync(UploadStatusRepository(dao), sync, online)) }

    private fun pending(vararg ids: String) {
        dao.state.value = FakeWorkoutDao.State(sessions = ids.toList().associateWith { finishedSession(it) })
    }

    @Test fun `sin pendientes pide el logout directo`() = runTest {
        vm.request()

        assertEquals(SignOutSyncState.SignOut, vm.state.value)
    }

    @Test fun `una vez hecho el logout el aviso vuelve a Hidden`() = runTest {
        vm.request()
        vm.signOutHandled()

        assertEquals(SignOutSyncState.Hidden, vm.state.value)
    }

    @Test fun `con pendientes pregunta y cancelar no cierra`() = runTest {
        pending("w1", "w2")

        vm.request()
        assertEquals(SignOutSyncState.Asking(2), vm.state.value)

        vm.cancel()
        assertEquals(SignOutSyncState.Hidden, vm.state.value)
    }

    @Test fun `con solo comentarios sin subir pregunta con el conteo aparte`() = runTest {
        dao.state.value = FakeWorkoutDao.State(
            sessions = mapOf("w1" to finishedSession("w1", syncState = SYNC_SYNCED).copy(rpe = 7, feedbackState = FEEDBACK_PENDING)),
        )

        vm.request()

        assertEquals(SignOutSyncState.Asking(pending = 0, feedback = 1), vm.state.value)
    }

    @Test fun `subir ahora con red sube todo y pide el logout`() = runTest {
        pending("w1")
        sync.onSyncNow = { dao.setSyncState("w1", SYNC_SYNCED) }

        vm.request()
        vm.uploadNow()

        assertEquals(1, sync.syncNowCalls)
        assertEquals(SignOutSyncState.SignOut, vm.state.value)
    }

    // Codex ronda 4: antes cerraba sesión como si todo hubiera subido.
    @Test fun `si el servidor rechaza la sesion avisa y no cierra solo`() = runTest {
        pending("w1")
        sync.onSyncNow = { dao.setSyncState("w1", SYNC_FAILED) }

        vm.request()
        vm.uploadNow()
        assertEquals(SignOutSyncState.Rejected, vm.state.value)

        vm.signOutAnyway()
        assertEquals(SignOutSyncState.SignOut, vm.state.value)
    }

    @Test fun `con el aviso de rechazo cancelar no cierra`() = runTest {
        pending("w1")
        sync.onSyncNow = { dao.setSyncState("w1", SYNC_FAILED) }

        vm.request()
        vm.uploadNow()
        vm.cancel()

        assertEquals(SignOutSyncState.Hidden, vm.state.value)
    }

    @Test fun `subir ahora sin red falla al instante`() = runTest {
        pending("w1")
        online.state.value = false

        vm.request()
        vm.uploadNow()

        assertEquals(0, sync.syncNowCalls)
        assertEquals(SignOutSyncState.Failed(1), vm.state.value)
    }

    @Test fun `si queda algo pendiente avisa y cerrar igual pide el logout`() = runTest {
        pending("w1")
        sync.syncNowResult = false

        vm.request()
        vm.uploadNow()
        assertEquals(SignOutSyncState.Failed(1), vm.state.value)

        vm.signOutAnyway()
        assertEquals(SignOutSyncState.SignOut, vm.state.value)
    }

    @Test fun `reintentar despues de fallar sube y pide el logout`() = runTest {
        pending("w1")
        sync.syncNowResult = false

        vm.request()
        vm.uploadNow()
        assertEquals(SignOutSyncState.Failed(1), vm.state.value)

        sync.onSyncNow = { dao.setSyncState("w1", SYNC_SYNCED) }
        vm.uploadNow()

        assertEquals(SignOutSyncState.SignOut, vm.state.value)
    }

    @Test fun `si syncNow tira una excepcion queda en Failed y no crashea`() = runTest {
        pending("w1")
        sync.onSyncNow = { throw IllegalStateException("boom") }

        vm.request()
        vm.uploadNow()

        assertEquals(SignOutSyncState.Failed(1), vm.state.value)
    }

    @Test fun `doble toque en subir ahora sube una sola vez`() = runTest {
        pending("w1")
        val gate = CompletableDeferred<Unit>()
        sync.onSyncNow = { gate.await(); dao.setSyncState("w1", SYNC_SYNCED) }

        vm.request()
        vm.uploadNow()
        vm.uploadNow()
        vm.signOutAnyway()
        assertEquals(SignOutSyncState.Uploading, vm.state.value)
        gate.complete(Unit)

        assertEquals(1, sync.syncNowCalls)
        assertEquals(SignOutSyncState.SignOut, vm.state.value)
    }

    @Test fun `un segundo request con el aviso abierto se ignora`() = runTest {
        pending("w1")

        vm.request()
        pending("w1", "w2")
        vm.request()

        assertEquals(SignOutSyncState.Asking(1), vm.state.value)
    }

    @Test fun `sin aviso abierto subir ahora y cerrar igual no hacen nada`() = runTest {
        pending("w1")

        vm.uploadNow()
        vm.signOutAnyway()

        assertEquals(0, sync.syncNowCalls)
        assertEquals(SignOutSyncState.Hidden, vm.state.value)
    }
}
