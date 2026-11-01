package com.fittrainer.data.progress.progressrepository

import com.fittrainer.data.api.progress.OverviewExerciseDto
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.progress.ProgressRepository
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.progress.FakeProgressApi
import com.fittrainer.testing.fakes.progress.FakeProgressDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.httpError
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La lista del desplegable: GET /progress/overview guardado en Room por dueño. */
@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class ProgressRepositoryExercisesTest {
    private val api = FakeProgressApi()
    private val dao = FakeProgressDao()
    // 1/11 a las 02:00 UTC: en Argentina todavía es 31/10.
    private val now = Instant.parse("2026-11-01T02:00:00Z").toEpochMilli()
    private val clock = MutableClock(now)
    private val repository = ProgressRepository(api, dao, { FakeStudentSession() }, clock)

    private val overview = listOf(
        OverviewExerciseDto("e1", "Sentadilla", 12, "2026-10-30"),
        OverviewExerciseDto("e2", "Press inclinado", 3, "2026-04-02"),
    )

    @Test fun nuncaBajadaNoTieneFechaYEstaVacia() = runTest {
        val list = repository.observeTrainedExercises("u1").first()
        assertTrue(list.items.isEmpty())
        assertNull(list.fetchedAt)
    }

    @Test fun guardaTodosLosEjerciciosDelOverviewConLaFechaDeBajada() = runTest {
        api.trained = overview
        repository.refreshExercises("u1").getOrThrow()
        val list = repository.observeTrainedExercises("u1").first()
        assertEquals(
            listOf(TrainedExercise("e1", "Sentadilla", 12, "2026-10-30"), TrainedExercise("e2", "Press inclinado", 3, "2026-04-02")),
            list.items,
        )
        assertEquals(now, list.fetchedAt)
    }

    /** El volumen semanal no se usa: `from` = hoy en Argentina para que venga corto (y no futuro para el backend). */
    @Test fun pideDesdeHoyEnHoraDeArgentina() = runTest {
        repository.refreshExercises("u1")
        assertEquals(listOf<String?>("2026-10-31"), api.overviewFroms)
    }

    /** Bajada y vacía: tiene fecha. Es la única que habilita "Terminá tu primera sesión". */
    @Test fun unaListaVaciaBajadaTieneFecha() = runTest {
        repository.refreshExercises("u1").getOrThrow()
        val list = repository.observeTrainedExercises("u1").first()
        assertTrue(list.items.isEmpty())
        assertEquals(now, list.fetchedAt)
    }

    @Test fun noVuelveAPedirAntesDeCincoMinutosSalvoForce() = runTest {
        repository.refreshExercises("u1")
        clock.millis += 4 * 60_000L
        repository.refreshExercises("u1")
        assertEquals(1, api.overviewCalls)
        repository.refreshExercises("u1", force = true)
        assertEquals(2, api.overviewCalls)
        clock.millis += 5 * 60_000L
        repository.refreshExercises("u1")
        assertEquals(3, api.overviewCalls)
    }

    @Test fun laListaNuevaReemplazaALaAnterior() = runTest {
        api.trained = overview
        repository.refreshExercises("u1")
        api.trained = listOf(OverviewExerciseDto("e3", "Remo", 1, "2026-10-31"))
        repository.refreshExercises("u1", force = true)
        assertEquals(listOf("e3"), repository.observeTrainedExercises("u1").first().items.map { it.exerciseId })
    }

    @Test fun unErrorNoBorraLoGuardado() = runTest {
        api.trained = overview
        repository.refreshExercises("u1")
        api.error = httpError(503)
        assertTrue(repository.refreshExercises("u1", force = true).exceptionOrNull() is DataException)
        val list = repository.observeTrainedExercises("u1").first()
        assertEquals(2, list.items.size)
        assertEquals(now, list.fetchedAt)
    }

    @Test fun unaRespuestaQueLlegaDespuesDelLogoutNoEscribe() = runTest {
        api.trained = overview
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        val result = async { repository.refreshExercises("u1") }
        runCurrent()
        repository.clearUserData("u1")
        gate.complete(Unit)
        assertTrue(result.await().exceptionOrNull()?.cause is AccountChangedException)
        assertTrue(dao.state.value.exercises.isEmpty() && dao.state.value.exercisesMetas.isEmpty())
    }
}
