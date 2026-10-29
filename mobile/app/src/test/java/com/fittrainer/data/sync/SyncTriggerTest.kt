package com.fittrainer.data.sync

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionSync
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.plus
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SyncTriggerTest {

    private val dao = FakeWorkoutDao()
    private val session = FakeStudentSession()
    private val sync = FakeSessionSync()
    private val trigger = SyncTrigger(session, dao, sync)

    private fun put(vararg sessions: WorkoutSessionEntity) {
        dao.state.value = dao.state.value.copy(sessions = dao.state.value.sessions + sessions.associateBy { it.id })
    }

    @Test fun `al abrir con pendientes encola una pasada`() = runTest {
        put(finishedSession("w1"))
        trigger.start(backgroundScope + UnconfinedTestDispatcher(testScheduler))

        assertEquals(1, sync.enqueued)
    }

    @Test fun `terminar otra sesion vuelve a encolar`() = runTest {
        trigger.start(backgroundScope + UnconfinedTestDispatcher(testScheduler))
        assertEquals(0, sync.enqueued)

        put(finishedSession("w1"))
        put(finishedSession("w2"))

        assertEquals(2, sync.enqueued)
    }

    @Test fun `una sesion abierta o ya subida no encola`() = runTest {
        put(finishedSession("activa", status = STATUS_ACTIVE), finishedSession("subida", syncState = SYNC_SYNCED))
        trigger.start(backgroundScope + UnconfinedTestDispatcher(testScheduler))

        assertEquals(0, sync.enqueued)
    }

    @Test fun `sin alumno logueado no encola y al entrar si`() = runTest {
        put(finishedSession("w1"))
        session.session.value = Session.LoggedOut
        trigger.start(backgroundScope + UnconfinedTestDispatcher(testScheduler))
        assertEquals(0, sync.enqueued)

        session.session.value = Session.Student(AuthUser("u1", "Ana", "a@test.com", Role.STUDENT))

        assertEquals(1, sync.enqueued)
    }

    @Test fun `volver a entrar con las mismas pendientes vuelve a encolar`() = runTest {
        put(finishedSession("w1"))
        trigger.start(backgroundScope + UnconfinedTestDispatcher(testScheduler))
        assertEquals(1, sync.enqueued)

        session.session.value = Session.LoggedOut
        session.session.value = Session.Student(AuthUser("u1", "Ana", "a@test.com", Role.STUDENT))

        assertEquals(2, sync.enqueued)
    }
}
