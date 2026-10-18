package com.fittrainer.ui.workout

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.WorkoutLaunchRequests
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class WorkoutEntryViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val repo = WorkoutRepository(dao, MutableClock(T0.toEpochMilli())) { "w-1" }
    private val launches = WorkoutLaunchRequests()
    private val vm by lazy { WorkoutEntryViewModel(repo, FakeStudentSession(), launches) }

    private val routine = Routine(
        "rt-1", "Push", null, emptySet(), Instant.EPOCH,
        listOf(RoutineExercise("re-0", "ex-0", "E0", null, null, null, 2, 8, 60, 40.0, null, null)),
    )

    @Test fun `empezar crea la sesion y avisa cuando esta lista`() = runTest {
        var ready = false
        vm.start(routine) { ready = true }

        assertTrue(ready)
        assertTrue(vm.hasActive.value)
    }

    @Test fun `terminar la sesion abierta antes de salir`() = runTest {
        vm.start(routine) {}
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        var done = false

        vm.finishActive { done = true }

        assertTrue(done)
        assertFalse(vm.hasActive.value)
        assertNull(repo.observeActive("u1").first())
    }

    @Test fun `si Room falla al empezar no navega ni crashea`() = runTest {
        dao.failWrites = true
        var ready = false

        vm.start(routine) { ready = true }

        assertFalse(ready)
        assertFalse(vm.hasActive.value)
        assertEquals(START_FAILED, vm.error.value)
        vm.dismissError()
        assertNull(vm.error.value)
    }

    @Test fun `si Room falla al terminar no cierra la cuenta ni crashea`() = runTest {
        vm.start(routine) {}
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        dao.failWrites = true
        var done = false

        vm.finishActive { done = true }

        assertFalse(done)
        assertTrue(vm.hasActive.value)
        assertEquals(FINISH_FAILED, vm.error.value)
        // RoleShell muestra este aviso y lo descarta con el botón.
        vm.dismissError()
        assertNull(vm.error.value)
    }

    @Test fun `hasActiveNow ve la sesion abierta recien creado el VM`() = runTest {
        repo.start("u1", routine)

        assertTrue(vm.hasActiveNow())
    }

    @Test fun `hasActiveNow es false sin sesion`() = runTest {
        assertFalse(vm.hasActiveNow())
    }

    @Test fun `la notificacion pide abrir la sesion una sola vez`() = runTest {
        launches.request()
        assertTrue(vm.openRequests.value)
        vm.consumeOpenRequest()
        assertEquals(false, vm.openRequests.value)
    }
}
