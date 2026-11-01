package com.fittrainer.data.notifications.notificationsrepository

import com.fittrainer.data.notifications.NotificationsRepository
import com.fittrainer.testing.fakes.notifications.FakeNotificationDao
import com.fittrainer.testing.fakes.notifications.FakeNotificationsApi
import com.fittrainer.testing.fakes.notifications.notificationDto
import com.fittrainer.testing.fakes.notifications.offline
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Cursor de "Ver más" guardado en la meta, páginas que no suman nada y refrescos que llegan desordenados. */
@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsRepositoryCursorTest {
    private val api = FakeNotificationsApi()
    private val dao = FakeNotificationDao()
    private val session = FakeStudentSession()
    private val repository = NotificationsRepository(api, dao) { session }

    private fun ids() = dao.rows.value.keys
    private fun at(day: Int) = "2026-10-%02dT06:00:00+00:00".format(day)

    /** Escenario de Codex: una lectura pendiente aislada después de un hueco no corre el cursor del segundo refresco. */
    @Test fun pendienteAisladaTrasHuecoNoSalteaNotificaciones() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a", at = at(20)), notificationDto("p", at = at(19)), next = "c1"))
        repository.refresh("u1")
        api.failMarks = offline
        repository.markRead("u1", "p")
        val nuevas = api.page(notificationDto("x", at = at(30)), notificationDto("y", at = at(29)), next = "n1")
        api.pages = mapOf(
            null to nuevas,
            "n1" to api.page(notificationDto("z", at = at(25)), notificationDto("a", at = at(20)), next = "n2"),
            "n2" to api.page(notificationDto("p", at = at(19))),
        )
        repository.refresh("u1") // hueco
        repository.refresh("u1") // solapa: el cursor sigue siendo el del servidor ("n1")
        assertEquals(true, repository.loadMore("u1").getOrNull())
        assertEquals("n1", api.listCalls.last())
        assertEquals(false, repository.loadMore("u1").getOrNull())
        assertEquals(setOf("x", "y", "z", "a", "p"), ids()) // nada salteado
        assertTrue(dao.rows.value.getValue("p").read) // volvió del servidor sin leer, pero la marca pendiente gana
    }

    @Test fun solapamientoConservaElFinDeLaLista() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a", at = at(20))))
        repository.refresh("u1")
        api.pages = mapOf(null to api.page(notificationDto("b", at = at(21)), notificationDto("a", at = at(20)), next = "srv"))
        repository.refresh("u1")
        assertFalse(repository.hasMore("u1").first()) // lo guardado ya llegaba hasta el final
    }

    /** Revisión de Pablo: el hueco se decide con la página tal como vino, no con las filas que se guardan. */
    @Test fun paginaUnoSoloDeTiposAjenosQueLlegaALoGuardadoNoEsHueco() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a", at = at(20)), notificationDto("b", at = at(15)), next = "c1"))
        repository.refresh("u1")
        api.pages = mapOf(
            null to api.page(notificationDto("ap1", "appointment", at = at(25)), notificationDto("ap2", "appointment", at = at(18)), next = "srv"),
        )
        repository.refresh("u1")
        assertEquals(setOf("b"), ids()) // "a" cae en la ventana y no vino: ya no existe; "b" es anterior y queda
        assertEquals("c1", dao.meta("u1")!!.nextBefore) // el tramo guardado sigue contiguo
    }

    @Test fun paginaUnoSoloDeTiposAjenosMasNuevaQueLoGuardadoEsHueco() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("a", at = at(20)), next = "c1"))
        repository.refresh("u1")
        api.pages = mapOf(null to api.page(notificationDto("ap1", "appointment", at = at(25)), next = "srv"))
        repository.refresh("u1")
        assertTrue(ids().isEmpty())
        assertEquals("srv", dao.meta("u1")!!.nextBefore)
    }

    @Test fun loadMoreSigueMientrasLaPaginaNoSumaNada() = runTest {
        api.pages = mapOf(
            null to api.page(notificationDto("a", at = at(30)), next = "c1"),
            "c1" to api.page(notificationDto("i1", "inactivity", at = at(29)), next = "c2"),
            "c2" to api.page(notificationDto("a", at = at(30)), next = "c3"), // ya guardada: tampoco suma
            "c3" to api.page(notificationDto("b", at = at(27)), next = "c4"),
        )
        repository.refresh("u1")
        assertEquals(true, repository.loadMore("u1").getOrNull())
        assertEquals(listOf(null, "c1", "c2", "c3"), api.listCalls)
        assertEquals(setOf("a", "b"), ids())
        assertEquals("c4", dao.meta("u1")!!.nextBefore)
    }

    @Test fun loadMoreSinNadaVisibleTerminaCuandoNoHayMas() = runTest {
        api.pages = mapOf(
            null to api.page(notificationDto("a", at = at(30)), next = "c1"),
            "c1" to api.page(notificationDto("i1", "inactivity", at = at(29))),
        )
        repository.refresh("u1")
        assertEquals(false, repository.loadMore("u1").getOrNull())
        assertFalse(repository.hasMore("u1").first())
    }

    /** Dos refrescos no se pisan: el segundo espera al primero y pide recién cuando aquel ya aplicó. */
    @Test fun refrescosVanEnSerie() = runTest {
        api.pages = mapOf(null to api.page(notificationDto("viejo", at = at(20)), next = "cv"))
        val gate = CompletableDeferred<Unit>()
        api.listGates.add(gate)
        val primero = launch { repository.refresh("u1") }
        advanceUntilIdle()
        val segundo = launch { repository.refresh("u1") }
        advanceUntilIdle()
        assertEquals(1, api.listCalls.size) // el segundo espera el candado
        api.pages = mapOf(null to api.page(notificationDto("nuevo", at = at(30)), next = "cn"))
        gate.complete(Unit)
        primero.join()
        segundo.join()
        assertEquals(2, api.listCalls.size)
        assertEquals(setOf("nuevo"), ids())
        assertEquals("cn", dao.meta("u1")!!.nextBefore)
    }
}
