package com.fittrainer.ui.messages.student.badge

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.data.session.Role
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.messages.messageDto
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.ui.messages.trainer.badge.BADGE_POLL_MS
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

/** Tarjeta 18: el globito de Mensajes del alumno cuenta los del PT sin leer y se actualiza cada 15 s en primer plano. */
@OptIn(ExperimentalCoroutinesApi::class)
class StudentMessagesBadgeViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerMessagesApi().apply {
        pages = mapOf(null to page(messageDto("m1", 1, fromTrainer = true), messageDto("m2", 2), messageDto("m3", 3, fromTrainer = true, read = true)))
    }
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC))
    private val session = FakeStudentSession(AuthUser("s1", "Alumna Card", "alumna@test.com", Role.STUDENT))

    @Test fun cuentaSoloLosDelPtSinLeerYSeActualizaSoloEnPrimerPlano() = runTest {
        val vm = StudentMessagesBadgeViewModel(repo, session)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.unread.collect {} }
        vm.onForeground()
        runCurrent()
        assertEquals(1, vm.unread.value)

        api.pages = mapOf(null to api.page(messageDto("m1", 1, fromTrainer = true), messageDto("m4", 4, fromTrainer = true)))
        advanceTimeBy(BADGE_POLL_MS)
        runCurrent()
        assertEquals(2, vm.unread.value)

        vm.onBackground()
        api.pages = mapOf(null to api.page(messageDto("m5", 5, fromTrainer = true)))
        advanceTimeBy(BADGE_POLL_MS * 2)
        runCurrent()
        assertEquals(2, vm.unread.value)
    }
}
