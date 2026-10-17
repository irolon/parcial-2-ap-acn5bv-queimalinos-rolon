package com.fittrainer.data.routine

import com.fittrainer.data.api.MineResponse
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.routineDto
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El caché es de un solo alumno: nunca se le muestra a otro ni lo borra el logout de otro. */
@OptIn(ExperimentalCoroutinesApi::class)
class RoutineRepositoryOwnerTest {

    private val clock = Clock.fixed(Instant.ofEpochMilli(5_000L), ZoneOffset.UTC)
    private val api = FakeRoutineApi()
    private val dao = FakeRoutineDao()
    private val repo = RoutineRepository(api, dao, clock)

    private suspend fun syncAs(owner: String, routineId: String) {
        api.response = MineResponse(listOf(routineDto(routineId)))
        repo.refresh(owner)
    }

    // Codex P1: Room re-consulta rutinas y dueño por separado; el dueño nuevo puede llegar antes.
    @Test fun `al cambiar de duenio nunca emite las rutinas del anterior`() = runTest {
        syncAs("A", "rt-A")
        val seen = mutableListOf<List<String>>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            repo.observeCache("B").collect { cache -> seen += cache.routines.map { it.id } }
        }

        dao.holdRoutinesView = true
        syncAs("B", "rt-B")
        dao.holdRoutinesView = false

        assertTrue("emisiones: $seen", seen.none { "rt-A" in it })
        assertEquals(listOf("rt-B"), seen.last())
    }

    // Codex P2: el logout de A termina tarde, cuando B ya entró y sincronizó.
    @Test fun `el borrado de otro duenio no toca el cache actual`() = runTest {
        syncAs("B", "rt-B")

        repo.clearUserData("A")

        val cache = repo.observeCache("B").first()
        assertEquals(listOf("rt-B"), cache.routines.map { it.id })
        assertEquals(Instant.ofEpochMilli(5_000L), cache.lastSyncedAt)
    }

    @Test fun `sin duenio conocido el borrado limpia todo`() = runTest {
        syncAs("A", "rt-A")

        repo.clearUserData(null)

        assertNull(dao.state.value.sync)
        assertTrue(dao.state.value.routines.isEmpty())
    }
}
