package com.fittrainer.ui.sync.uploadstatus

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.pendingSet
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

/** Conteos del aviso de Hoy, descartar rechazos y estado de una sesión. */
class UploadStatusCountsTest : UploadStatusTestBase() {

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
