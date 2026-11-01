package com.fittrainer.data.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryExerciseDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySetDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.api.history.NamedRefDto
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.session.Role
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HistoryRepositoryRefreshTest {
    private val api = FakeSessionApi()
    private val session = FakeStudentSession()
    private val dao = FakeHistoryDao()
    private val repository = HistoryRepository(api, dao, FakeWorkoutDao()) { session }

    private fun summary(id: String, day: Int, sets: Int = 3) =
        HistorySummaryDto(id, "2026-10-%02dT12:00:00Z".format(day), "2026-10-%02dT12:50:00Z".format(day), 50, NamedRefDto("r1", "Push"), sets = sets, volumeKg = 300.0)

    private fun detail(id: String, day: Int) = HistoryDetailDto(
        id, "2026-10-%02dT12:00:00Z".format(day), exercises = listOf(
            HistoryExerciseDto(NamedRefDto("e1", "Press"), sets = listOf(HistorySetDto("$id-s1", 1, 10, 40.0, "2026-10-%02dT12:05:00Z".format(day)))),
        ),
    )

    private fun page(vararg s: HistorySummaryDto, totalPages: Int = 1) = HistoryPageDto(s.toList(), HistoryMetaDto(s.size, 1, 20, totalPages))

    @Test fun refrescoGuardaLasVeinteConSuDetalle() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), summary("b", 1)))
        api.details = mapOf("a" to detail("a", 2), "b" to detail("b", 1))
        assertTrue(repository.refresh("u1").isSuccess)
        assertEquals(setOf("a", "b"), dao.state.value.sessions.keys)
        assertTrue(dao.state.value.sessions.values.all { it.detailLoaded && it.inLatest })
        assertEquals(2, dao.state.value.sets.size)
    }

    @Test fun soloPideElDetalleDeLasNuevasOCambiadas() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), summary("b", 1)))
        api.details = mapOf("a" to detail("a", 2), "b" to detail("b", 1))
        repository.refresh("u1")
        api.detailCalls.clear()
        api.historyPages = mapOf(1 to page(summary("c", 3), summary("a", 2, sets = 4), summary("b", 1)))
        api.details = api.details + ("c" to detail("c", 3))
        repository.refresh("u1")
        assertEquals(listOf("c", "a"), api.detailCalls)
    }

    @Test fun siFallaUnDetalleConservaLoGuardadoYLoReintentaDespues() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), summary("b", 1)))
        api.details = mapOf("a" to detail("a", 2), "b" to detail("b", 1))
        api.failDetails = setOf("b")
        assertTrue(repository.refresh("u1").isFailure)
        assertTrue(dao.state.value.sessions.getValue("a").detailLoaded)
        assertFalse(dao.state.value.sessions.getValue("b").detailLoaded)
        api.failDetails = emptySet()
        api.detailCalls.clear()
        repository.refresh("u1")
        assertEquals(listOf("b"), api.detailCalls)
    }

    @Test fun siUnDetalleFallaPorRedNoPideLosDemasYGuardaLaPagina() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), summary("b", 1)))
        api.details = mapOf("a" to detail("a", 2), "b" to detail("b", 1))
        api.failDetails = setOf("a")
        val result = repository.refresh("u1")
        assertTrue(result.isFailure)
        assertEquals(listOf("a"), api.detailCalls)
        assertEquals(setOf("a", "b"), dao.state.value.sessions.keys)
    }

    @Test fun siUnDetalleFallaConHttpSigueConLosDemas() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), summary("b", 1)))
        api.details = mapOf("a" to detail("a", 2), "b" to detail("b", 1))
        api.failDetails = setOf("a")
        api.detailFailure = httpError(500)
        assertTrue(repository.refresh("u1").isFailure)
        assertEquals(listOf("a", "b"), api.detailCalls)
    }

    @Test fun siCambioLaCuentaDuranteElRefrescoNoEscribeNada() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2)))
        api.details = mapOf("a" to detail("a", 2))
        session.session.value = com.fittrainer.data.session.Session.Student(AuthUser("u2", "Otro", "o@test.com", Role.STUDENT))
        assertTrue(repository.refresh("u1").isFailure)
        assertTrue(repository.loadMore("u1", 2).isFailure)
        assertTrue(repository.loadDetail("u1", "a").isFailure)
        assertTrue(dao.state.value.sessions.isEmpty())
        assertTrue(dao.state.value.sets.isEmpty())
    }

    @Test fun siCierraSesionEnMedioDelRefrescoNoGuardaLosDetalles() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), summary("b", 1)))
        api.details = mapOf("a" to detail("a", 2), "b" to detail("b", 1))
        api.onDetail = { id -> if (id == "a") session.session.value = com.fittrainer.data.session.Session.LoggedOut }
        assertTrue(repository.refresh("u1").isFailure)
        assertTrue(dao.state.value.sets.isEmpty())
    }

    @Test fun siLaLimpiezaCorrioMientrasVolabaElDetalleNoReescribeLoBorrado() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2)))
        api.details = mapOf("a" to detail("a", 2))
        api.onDetail = { kotlinx.coroutines.runBlocking { repository.clearUserData("u1") } }
        assertTrue(repository.refresh("u1").isFailure)
        assertTrue(dao.state.value.sets.isEmpty())
    }

    @Test fun elRefrescoNoBorraLasDeVerMasPeroSiLasQueSeBorraronDentroDeLaVentana() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 4), summary("borrada", 3), summary("b", 2), totalPages = 2), 2 to page(summary("viejo", 1), totalPages = 2))
        api.details = mapOf("a" to detail("a", 4), "borrada" to detail("borrada", 3), "b" to detail("b", 2))
        repository.refresh("u1")
        repository.loadMore("u1", 2)
        api.historyPages = mapOf(1 to page(summary("a", 4), summary("b", 2), totalPages = 2))
        repository.refresh("u1")
        assertEquals(setOf("a", "b", "viejo"), dao.state.value.sessions.keys)
        assertFalse(dao.state.value.sessions.getValue("viejo").inLatest)
    }

    @Test fun siElServidorNoTieneMasQueEstasBorraTodasLasQueNoVinieron() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 3), totalPages = 2), 2 to page(summary("viejo", 1), totalPages = 2))
        api.details = mapOf("a" to detail("a", 3))
        repository.refresh("u1")
        repository.loadMore("u1", 2)
        api.historyPages = mapOf(1 to page(summary("a", 3), totalPages = 1))
        repository.refresh("u1")
        assertEquals(setOf("a"), dao.state.value.sessions.keys)
    }

    @Test fun siNingunaDeLasQueVinieronEstabaGuardadaBorraTodasPorqueNoSeSabeSiHayHueco() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), totalPages = 3))
        api.details = mapOf("a" to detail("a", 2), "n" to detail("n", 9))
        repository.refresh("u1")
        api.historyPages = mapOf(1 to page(summary("n", 9), totalPages = 3)) // más de 20 nuevas: "a" quedó en la página 2
        repository.refresh("u1")
        assertEquals(setOf("n"), dao.state.value.sessions.keys)
    }

    @Test fun elDetalleDeUnaSesionQueYaNoEstaNoEscribeNiFalla() = runTest {
        api.details = mapOf("fantasma" to detail("fantasma", 2))
        assertTrue(repository.loadDetail("u1", "fantasma").isSuccess)
        assertTrue(dao.state.value.sets.isEmpty())
    }

    @Test fun verMasNoDuplicaNiPisaUnaDeLasVeinte() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), totalPages = 2), 2 to page(summary("a", 2), totalPages = 2))
        api.details = mapOf("a" to detail("a", 2))
        repository.refresh("u1")
        repository.loadMore("u1", 2)
        val a = dao.state.value.sessions.getValue("a")
        assertTrue(a.inLatest && a.detailLoaded)
    }

    @Test fun elRefrescoDiceSiHayMasDeVeinte() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), totalPages = 2))
        api.details = mapOf("a" to detail("a", 2))
        repository.refresh("u1")
        assertEquals(2, repository.totalPagesAfterRefresh)
    }

    @Test fun verMasDiceSiHayMasPaginas() = runTest {
        api.historyPages = mapOf(2 to page(summary("x", 1), totalPages = 3))
        assertEquals(LoadMoreResult.Page(hasMore = true, nextPage = 3), repository.loadMore("u1", 2).getOrThrow())
    }

    @Test fun sinRedFallaConOfflineYNoTocaElCache() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2)))
        api.details = mapOf("a" to detail("a", 2))
        repository.refresh("u1")
        api.historyError = java.io.IOException("sin red")
        val result = repository.refresh("u1")
        assertTrue(result.isFailure)
        assertEquals(setOf("a"), dao.state.value.sessions.keys)
    }

    @Test fun limpiarBorraSoloAlDueno() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2)))
        api.details = mapOf("a" to detail("a", 2))
        repository.refresh("u1")
        repository.clearUserData("otro")
        assertEquals(setOf("a"), dao.state.value.sessions.keys)
        repository.clearUserData("u1")
        assertTrue(dao.state.value.sessions.isEmpty())
    }
}
