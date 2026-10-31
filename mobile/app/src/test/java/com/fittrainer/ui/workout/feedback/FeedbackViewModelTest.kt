package com.fittrainer.ui.workout.feedback

import com.fittrainer.data.workout.IdGenerator
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.fixedClock
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class FeedbackViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val dao = FakeWorkoutDao().apply { state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession())) }
    private val vm = FeedbackViewModel(WorkoutRepository(dao, fixedClock(), IdGenerator { "id" }))

    @Test fun guardarSeHabilitaConRpeOConNota() {
        assertFalse(vm.state.value.canSave)
        vm.onNotes("  ")
        assertFalse(vm.state.value.canSave)
        vm.onRpe(7)
        assertTrue(vm.state.value.canSave)
    }

    @Test fun guardaYTermina() = runTest {
        vm.onRpe(7)
        vm.onNotes("pesado")
        vm.save("w1")
        assertTrue(vm.state.value.done)
        assertEquals(7, dao.state.value.sessions.getValue("w1").rpe)
    }

    @Test fun tocarElMismoRpeLoDesmarca() {
        vm.onRpe(7)
        vm.onRpe(7)
        assertEquals(null, vm.state.value.rpe)
    }

    @Test fun laNotaNoPasaDeMilCaracteres() {
        vm.onNotes("x".repeat(1200))
        assertEquals(1000, vm.state.value.notes.length)
    }

    @Test fun siRoomFallaMuestraErrorYNoTermina() = runTest {
        dao.failWrites = true
        vm.onRpe(5)
        vm.save("w1")
        assertTrue(vm.state.value.error)
        assertFalse(vm.state.value.done)
    }
}
