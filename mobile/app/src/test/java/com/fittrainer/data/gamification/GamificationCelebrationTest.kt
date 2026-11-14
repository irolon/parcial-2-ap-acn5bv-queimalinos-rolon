package com.fittrainer.data.gamification

import com.fittrainer.data.db.gamification.CELEBRATION_SHOWN
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.gamification.FakeGamificationApi
import com.fittrainer.testing.fakes.gamification.FakeGamificationDao
import com.fittrainer.testing.fakes.gamification.progressDto
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import java.time.Instant
import javax.inject.Provider
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class GamificationCelebrationTest {
    private val api = FakeGamificationApi()
    private val dao = FakeGamificationDao()
    private val session = FakeStudentSession()
    // Viernes 30/10 12:00 AR.
    private val clock = StepClock(Instant.parse("2026-10-30T15:00:00Z"))
    private val repo = GamificationRepository(api, dao, RoutineRepository(FakeRoutineApi(), FakeRoutineDao(), clock), Provider { session }, clock)
    private val fetchedAt get() = dao.state.value.snapshots.getValue("u1").fetchedAt

    private fun finish(vararg sessions: FinishedSession) = dao.state.update { it.copy(finished = mapOf("u1" to sessions.toList())) }
    private fun codes() = dao.state.value.celebrations.map { it.code }

    @Test fun sinFotoNoEvaluaNada() = runTest {
        finish(FinishedSession(clock.millis() - 60_000, clock.millis()))
        repo.evaluateLocal("u1")
        assertEquals(emptyList<String>(), codes())
    }

    @Test fun unaSesionDespuesDeLaFotoCompletaLasDiezSesiones() = runTest {
        api.progress = progressDto(sessions = 9)
        repo.refresh("u1")
        val before = FinishedSession(fetchedAt - 120_000, fetchedAt - 1_000)
        finish(before)
        repo.evaluateLocal("u1")
        assertEquals(emptyList<String>(), codes())
        finish(before, FinishedSession(fetchedAt - 60_000, fetchedAt + 1_000))
        repo.evaluateLocal("u1")
        assertEquals(listOf("SESSIONS_10"), codes())
    }

    @Test fun elSeptimoDiaCelebraLaRachaSinRed() = runTest {
        api.progress = progressDto(sessions = 6, current = 6, longest = 6, last = "2026-10-29")
        repo.refresh("u1")
        finish(FinishedSession(fetchedAt - 60_000, fetchedAt + 60_000))
        repo.evaluateLocal("u1")
        assertEquals(listOf("STREAK_7_DAYS"), codes())
    }

    @Test fun noSeCelebraDosVecesNiLoQueElCelularNoSabeContar() = runTest {
        api.progress = progressDto(sessions = 9)
        repo.refresh("u1")
        finish(FinishedSession(fetchedAt - 60_000, fetchedAt + 1_000))
        repo.evaluateLocal("u1")
        repo.evaluateLocal("u1")
        repo.onUnlocked("u1", listOf(UnlockedAchievement("SESSIONS_10", "10 sesiones", "milestone")))
        assertEquals(listOf("SESSIONS_10"), codes())
    }

    @Test fun elSyncAnotaLosDelServidorConLaDescripcionDelCatalogo() = runTest {
        repo.refresh("u1")
        repo.onUnlocked("u1", listOf(UnlockedAchievement("FIRST_PR", "Primer récord", "pr")))
        val row = dao.state.value.celebrations.single()
        assertEquals("Descripción FIRST_PR", row.description)
        assertEquals(listOf(Celebration("FIRST_PR", "Primer récord", "Descripción FIRST_PR", "pr")), repo.observePending("u1").first())
    }

    @Test fun elSyncDeOtraCuentaNoAnotaNada() = runTest {
        session.session.value = Session.LoggedOut
        repo.onUnlocked("u1", listOf(UnlockedAchievement("FIRST_PR", "Primer récord", "pr")))
        assertEquals(emptyList<String>(), codes())
    }

    @Test fun siLaSesionCambiaAntesDelInsertNoSeEscribeNada() = runTest {
        api.progress = progressDto(sessions = 9)
        repo.refresh("u1")
        finish(FinishedSession(fetchedAt - 60_000, fetchedAt + 1_000))
        session.session.value = Session.LoggedOut
        repo.evaluateLocal("u1")
        assertEquals(emptyList<String>(), codes())
    }

    @Test fun mostrarLasDejaComoVistas() = runTest {
        repo.refresh("u1")
        repo.onUnlocked("u1", listOf(UnlockedAchievement("FIRST_PR", "Primer récord", "pr")))
        repo.markShown("u1", listOf("FIRST_PR"))
        assertEquals(CELEBRATION_SHOWN, dao.state.value.celebrations.single().state)
        assertEquals(emptyList<Celebration>(), repo.observePending("u1").first())
    }

    @Test fun despuesDeSubirRefresca() = runTest {
        repo.afterUploads("u1")
        assertEquals(1, api.progressCalls)
    }

    @Test fun despuesDeSubirElRefrescoArrancaDespuesDelQueVolaba() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        val ui = async { repo.refresh("u1") }
        runCurrent()
        val sync = async { repo.afterUploads("u1") }
        runCurrent()
        gate.complete(Unit)
        ui.await()
        sync.await()
        // El de la UI arrancó antes de la subida: el del sync no puede darse por cubierto con ese.
        assertEquals(2, api.progressCalls)
    }
}
