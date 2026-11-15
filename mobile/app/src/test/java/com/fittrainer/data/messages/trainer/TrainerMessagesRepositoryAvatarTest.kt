package com.fittrainer.data.messages.trainer

import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesApi
import com.fittrainer.testing.fakes.messages.FakeTrainerMessagesDao
import com.fittrainer.testing.fakes.messages.messageDto
import com.fittrainer.testing.fakes.routine.StepClock
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** La foto de la contraparte (el alumno para el PT, el PT para el alumno) se guarda con el hilo. */
class TrainerMessagesRepositoryAvatarTest {
    private val api = FakeTrainerMessagesApi()
    private val repo = TrainerMessagesRepository(api, FakeTrainerMessagesDao(), StepClock(Instant.parse("2026-11-01T13:00:00Z")))

    private suspend fun avatar() = repo.observeThread("t1", "s1").first()!!.avatarUrl

    @Test fun savesCounterpartAvatar() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1), avatarUrl = "https://firmada"))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals("https://firmada", avatar())
    }

    @Test fun mergeUpdatesAvatar() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1)))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertNull(avatar())

        // Un backend viejo no mandaba la foto; el refresco siguiente (merge) la trae.
        api.pages = mapOf(null to api.page(messageDto("m1", 1), messageDto("m2", 2), avatarUrl = "https://firmada"))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertEquals("https://firmada", avatar())
    }

    @Test fun missingAvatarIsNull() = runTest {
        api.pages = mapOf(null to api.page(messageDto("m1", 1)))
        repo.refreshThread("t1", "s1").getOrThrow()
        assertNull(avatar())
    }
}
