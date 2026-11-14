package com.fittrainer.data.gamification

import com.fittrainer.data.db.gamification.CELEBRATION_PENDING
import com.fittrainer.data.db.gamification.CelebrationEntity
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.gamification.FakeGamificationApi
import com.fittrainer.testing.fakes.gamification.FakeGamificationDao
import com.fittrainer.testing.fakes.gamification.OLD_UNLOCK
import com.fittrainer.testing.fakes.gamification.challengeDto
import com.fittrainer.testing.fakes.gamification.progressDto
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import java.io.IOException
import java.time.Instant
import javax.inject.Provider
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GamificationRepositoryTest {
    private val api = FakeGamificationApi()
    private val dao = FakeGamificationDao()
    private val session = FakeStudentSession()
    private val clock = StepClock(Instant.parse("2026-10-30T15:00:00Z"))
    private val repo = GamificationRepository(api, dao, RoutineRepository(FakeRoutineApi(), FakeRoutineDao(), clock), Provider { session }, clock)

    @Test fun sinFotoElResumenEsNull() = runTest { assertNull(repo.observeSummary("u1").first()) }

    @Test fun refrescaFotoLogrosYDesafios() = runTest {
        api.progress = progressDto(sessions = 3, current = 2, longest = 4, last = "2026-10-29")
        api.challenges = listOf(challengeDto())
        assertTrue(repo.refresh("u1").isSuccess)
        val summary = repo.observeSummary("u1").first()!!
        assertEquals(2, summary.currentStreak)
        assertEquals(listOf("FIRST_SESSION", "SESSIONS_10", "STREAK_7_DAYS", "FIRST_PR", "CHALLENGE_DONE"), summary.achievements.map { it.achievement.code })
        assertEquals(3, summary.achievements[1].current)
        assertEquals("12 sesiones en 30 días", summary.challenges.single().name)
        assertEquals(clock.millis(), dao.state.value.snapshots.getValue("u1").fetchedAt)
    }

    @Test fun siFallaLaRedRoomQuedaComoEstaba() = runTest {
        repo.refresh("u1")
        api.progress = progressDto(sessions = 5)
        api.error = IOException("sin red")
        val result = repo.refresh("u1")
        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals(0, dao.state.value.snapshots.getValue("u1").sessionsCount)
    }

    @Test fun dosRefrescosJuntosHacenUnSoloPedido() = runTest {
        val gate = CompletableDeferred<Unit>().also { api.gate = it }
        val first = async { repo.refresh("u1") }
        val second = async { repo.refresh("u1") }
        testScheduler.runCurrent()
        gate.complete(Unit)
        assertTrue(first.await().isSuccess && second.await().isSuccess)
        assertEquals(1, api.progressCalls)
    }

    @Test fun unRefrescoQueVolabaDuranteElLogoutNoEscribe() = runTest {
        api.onProgress = { session.session.value = Session.LoggedOut }
        assertTrue(repo.refresh("u1").isFailure)
        assertNull(dao.state.value.snapshots["u1"])
    }

    @Test fun laPrimeraFotoNoCelebraLoViejo() = runTest {
        api.progress = progressDto(sessions = 1, unlocked = mapOf("FIRST_SESSION" to "2026-10-01T10:00:00+00:00"))
        repo.refresh("u1")
        assertEquals(emptyList<Any>(), dao.state.value.celebrations)
    }

    @Test fun laSiguienteFotoCelebraLoQueEstabaBloqueadoYAhoraNo() = runTest {
        api.progress = progressDto(unlocked = mapOf("FIRST_PR" to OLD_UNLOCK))
        repo.refresh("u1")
        api.progress = progressDto(sessions = 1, unlocked = mapOf("FIRST_PR" to OLD_UNLOCK))
        repo.refresh("u1")
        assertEquals(listOf("FIRST_SESSION"), dao.state.value.celebrations.map { it.code })
    }

    @Test fun unLogoutSinCambioDeSesionDuranteElPedidoNoEscribeNada() = runTest {
        api.onProgress = { runBlocking { repo.clearUserData("u1") } }
        assertTrue(repo.refresh("u1").isFailure)
        assertEquals(FakeGamificationDao.State(), dao.state.value)
    }

    @Test fun unLogoutEnElMedioNoDejaMarcadoComoRecienRefrescado() = runTest {
        api.onProgress = { runBlocking { repo.clearUserData("u1") } }
        repo.refresh("u1")
        api.onProgress = {}
        assertTrue(repo.refresh("u1").isSuccess)
        assertEquals(2, api.progressCalls)
    }

    @Test fun nuncaDuplicaUnaCelebracionExistente() = runTest {
        repo.refresh("u1")
        val existing = CelebrationEntity("u1", "FIRST_SESSION", "Logro FIRST_SESSION", null, "milestone", CELEBRATION_PENDING, 123L)
        dao.insertCelebrations(listOf(existing))
        api.progress = progressDto(sessions = 1)
        repo.refresh("u1")
        assertEquals(listOf(existing), dao.state.value.celebrations)
    }

    @Test fun elLogoutBorraTodoLoDeLaCuenta() = runTest {
        repo.refresh("u1")
        repo.clearUserData("u1")
        assertEquals(FakeGamificationDao.State(), dao.state.value)
    }
}
