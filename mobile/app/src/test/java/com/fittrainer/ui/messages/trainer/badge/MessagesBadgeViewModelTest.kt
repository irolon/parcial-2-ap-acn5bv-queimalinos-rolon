package com.fittrainer.ui.messages.trainer.badge

import com.fittrainer.data.messages.trainer.TrainerMessagesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.messages.conversationDto
import com.fittrainer.testing.fakes.students.FakeTrainerSession
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

/** E11: el globito de Mensajes suma los no leídos y se actualiza cada 15 s con la app en primer plano. */
@OptIn(ExperimentalCoroutinesApi::class)
class MessagesBadgeViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerMessagesApi()
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), Clock.fixed(Instant.parse("2026-11-01T13:00:00Z"), ZoneOffset.UTC))

    @Test fun sumaLosNoLeidosYSeActualizaSoloEnPrimerPlano() = runTest {
        val vm = MessagesBadgeViewModel(repo, FakeTrainerSession())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.unread.collect {} }
        vm.onForeground()
        runCurrent()
        assertEquals(2, vm.unread.value)

        api.conversations = listOf(conversationDto("s1", "Ana", unread = 2), conversationDto("s2", "Beto", unread = 3))
        advanceTimeBy(BADGE_POLL_MS)
        runCurrent()
        assertEquals(5, vm.unread.value)

        vm.onBackground()
        api.conversations = listOf(conversationDto("s1", "Ana", unread = 9))
        advanceTimeBy(BADGE_POLL_MS * 2)
        runCurrent()
        assertEquals(5, vm.unread.value)
    }
}
