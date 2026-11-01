package com.fittrainer.data.challenges.trainer

import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesApi
import com.fittrainer.testing.fakes.challenges.FakeTrainerChallengesDao
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

/** Lo que Codex encontró en E10: un GET que salió antes de una escritura no pisa su resultado en Room. */
class TrainerChallengesRepositoryRaceTest {

    private val api = FakeTrainerChallengesApi()
    private val repo = TrainerChallengesRepository(api, FakeTrainerChallengesDao(), MutableClock(0))

    @Test fun `un GET atrasado de la ficha no borra una asignacion recien hecha`() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.studentGate = gate
        launch { repo.refreshStudent("t1", "s1") }
        runCurrent()
        api.studentGate = null
        launch { repo.assignToStudent("t1", "s1", "c1") }
        runCurrent()
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals(listOf("c1"), repo.observeStudent("t1", "s1").first()!!.items.map { it.challengeId })
    }

    @Test fun `un GET atrasado no borra lo asignado en lote`() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.studentGate = gate
        launch { repo.refreshStudent("t1", "s2") }
        runCurrent()
        api.studentGate = null
        launch { repo.assignMany("t1", "c2", listOf("s1", "s2")) }
        runCurrent()
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals(listOf("c2"), repo.observeStudent("t1", "s2").first()!!.items.map { it.challengeId })
    }
}
