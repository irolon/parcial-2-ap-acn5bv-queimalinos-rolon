package com.fittrainer.ui.sync.uploadstatus

import com.fittrainer.data.sync.ManualSync
import com.fittrainer.data.sync.UploadStatusRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionSync
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.ui.sync.UploadStatusViewModel
import org.junit.Rule

/** Fixture de los tests de [UploadStatusViewModel]: Room en memoria, alumno "u1" logueado y con red. */
abstract class UploadStatusTestBase {

    @get:Rule val main = MainDispatcherRule()

    protected val dao = FakeWorkoutDao()
    protected val session = FakeStudentSession()
    protected val sync = FakeSessionSync()
    protected val connectivity = FakeConnectivityObserver(online = true)
    protected val vm by lazy {
        UploadStatusViewModel(session, UploadStatusRepository(dao), ManualSync(UploadStatusRepository(dao), sync, connectivity))
    }

    protected fun pendingW1() {
        dao.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession("w1")))
    }

    /** Termina otra sesión offline (la "próxima" sesión del alumno). */
    protected fun finishW2() {
        dao.state.value = dao.state.value.copy(sessions = dao.state.value.sessions + ("w2" to finishedSession("w2")))
    }
}
