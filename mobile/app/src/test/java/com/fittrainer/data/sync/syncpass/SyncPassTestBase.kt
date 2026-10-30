package com.fittrainer.data.sync.syncpass

import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.sync.SessionUploader
import com.fittrainer.data.sync.SyncPass
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.pendingSet
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao

/** Fixture de los tests de [SyncPass]: Room y backend en memoria, alumno "u1" logueado. */
abstract class SyncPassTestBase {

    protected val dao = FakeWorkoutDao()
    protected val api = FakeSessionApi()
    protected val session = FakeStudentSession()
    protected val pass = SyncPass(dao, SessionUploader(api), session)

    /** Una pasada con otro backend (por ejemplo, uno que falla en un punto). */
    protected fun passWith(other: SessionApi) = SyncPass(dao, SessionUploader(other), session)

    protected fun seed(vararg sessions: WorkoutSessionEntity) {
        dao.state.value = FakeWorkoutDao.State(
            sessions = sessions.associateBy { it.id },
            sets = sessions.map { pendingSet("set-${it.id}", it.id) },
        )
    }

    protected fun syncState(id: String) = dao.state.value.sessions.getValue(id).syncState
    protected fun set(id: String) = dao.state.value.sets.single { it.id == id }
}
