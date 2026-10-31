package com.fittrainer.data.workout.history

import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.FEEDBACK_SYNCED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.pendingSet
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class HistoryRepositoryObserveTest {
    private val history = FakeHistoryDao()
    private val workouts = FakeWorkoutDao()
    private val repository = HistoryRepository(FakeSessionApi(), history, workouts) { FakeStudentSession() }

    private fun cached(id: String, startedAt: Long, owner: String = "u1", rpe: Int? = null) =
        HistorySessionEntity(id, owner, startedAt, startedAt + 3_000_000, 50, "Push", rpe, null, "Bien", false, 3, 300.0, true, true, true)

    @Test fun lasLocalesSinSubirVanArribaConSuMarca() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("a" to cached("a", 1_000)))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(startedAt = 500)), sets = listOf(pendingSet("s1")))
        val items = repository.observe("u1").first()
        assertEquals(listOf("w1", "a"), items.map { it.id })
        assertEquals(HistoryOrigin.LOCAL_PENDING, items.first().origin)
        assertEquals(1, items.first().sets)
        assertEquals(320.0, items.first().volumeKg, 0.0)
    }

    @Test fun unaSubidaQueYaEstaEnElCacheNoSeDuplica() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("w1" to cached("w1", 1_760_695_200_000L)))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED)))
        assertEquals(listOf("w1" to HistoryOrigin.SERVER), repository.observe("u1").first().map { it.id to it.origin })
    }

    @Test fun subidaPeroTodaviaSinRefrescarSeVeSinMarca() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("a" to cached("a", 1_000)))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED, startedAt = 2_000)))
        assertEquals(HistoryOrigin.LOCAL_SYNCED, repository.observe("u1").first().first().origin)
    }

    @Test fun unaSubidaViejaQueSalioDeLasVeinteNoReapareceArriba() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("a" to cached("a", 9_000)))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED, startedAt = 1_000)))
        assertEquals(listOf("a"), repository.observe("u1").first().map { it.id })
    }

    @Test fun elFeedbackPendienteDelCelularLeGanaAlCache() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("w1" to cached("w1", 1_760_695_200_000L, rpe = null)))
        workouts.state.value = FakeWorkoutDao.State(
            sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED).copy(rpe = 8, notes = "duro", feedbackState = FEEDBACK_PENDING)),
        )
        assertEquals(8, repository.observe("u1").first().single().rpe)
        assertEquals("duro", repository.observeDetail("u1", "w1").first()!!.notes)
    }

    @Test fun elFeedbackYaSubidoSigueGanandoleAUnCacheSinRpe() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("w1" to cached("w1", 1_760_695_200_000L, rpe = null)))
        workouts.state.value = FakeWorkoutDao.State(
            sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED).copy(rpe = 7, notes = null, feedbackState = FEEDBACK_SYNCED)),
        )
        assertEquals(7, repository.observe("u1").first().single().rpe)
        assertEquals(7, repository.observeDetail("u1", "w1").first()!!.item.rpe)
    }

    @Test fun elFeedbackSubidoNoPisaConNulosLoQueTraeElCache() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("w1" to cached("w1", 1_760_695_200_000L, rpe = 5)))
        workouts.state.value = FakeWorkoutDao.State(
            sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED).copy(rpe = null, notes = "duro", feedbackState = FEEDBACK_SYNCED)),
        )
        assertEquals(5, repository.observe("u1").first().single().rpe)
        assertEquals("duro", repository.observeDetail("u1", "w1").first()!!.notes)
    }

    @Test fun relojAtrasadoNoDaDuracionNegativa() = runTest {
        val session = finishedSession().let { it.copy(finishedAt = it.startedAt - 60_000) }
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to session))
        assertEquals(0, repository.observe("u1").first().single().durationMin)
    }

    @Test fun otraCuentaNoVeNadaAjeno() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("a" to cached("a", 1_000, owner = "u2")))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(owner = "u2")))
        assertEquals(emptyList<String>(), repository.observe("u1").first().map { it.id })
    }

    @Test fun detalleDeUnaLocalUsaSusSeriesYElPlanCopiado() = runTest {
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession()), sets = listOf(pendingSet("s1"), pendingSet("s2", setNumber = 2)))
        val detail = repository.observeDetail("u1", "w1").first()!!
        assertEquals(HistoryOrigin.LOCAL_PENDING, detail.item.origin)
        assertEquals(listOf(1, 2), detail.exercises.single().sets.map { it.setNumber })
    }
}
