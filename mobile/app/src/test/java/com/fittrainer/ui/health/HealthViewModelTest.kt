package com.fittrainer.ui.health

import com.fittrainer.MainDispatcherRule
import com.fittrainer.data.FakeHealthApi
import com.fittrainer.data.FakeHealthDao
import com.fittrainer.data.db.HealthSnapshotEntity
import com.fittrainer.data.repository.HealthRepository
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class HealthViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val clock = Clock.fixed(Instant.ofEpochMilli(1_000L), ZoneOffset.UTC)
    private val cached = HealthSnapshotEntity(
        status = "ok", version = "0.0.9", serverTimestamp = "2026-10-12T10:00:00.000Z", fetchedAt = 500L,
    )

    private fun viewModel(api: FakeHealthApi, dao: FakeHealthDao) =
        HealthViewModel(HealthRepository(api, dao, clock))

    @Test fun `al abrir refresca y muestra los datos`() = runTest {
        val vm = viewModel(FakeHealthApi(), FakeHealthDao())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        val state = vm.uiState.value
        assertEquals("0.1.0", state.snapshot?.version)
        assertFalse(state.isRefreshing)
        assertNull(state.error)
    }

    // Review Focus 5: primer arranque sin backend → vacío con error, no "cargando" para siempre.
    @Test fun `sin cache y sin red muestra error y snapshot null`() = runTest {
        val vm = viewModel(FakeHealthApi(error = IOException("sin red")), FakeHealthDao())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        val state = vm.uiState.value
        assertNull(state.snapshot)
        assertFalse(state.isRefreshing)
        assertEquals("Sin conexión con el servidor", state.error)
    }

    @Test fun `con cache y sin red conserva los datos y muestra el error`() = runTest {
        val vm = viewModel(FakeHealthApi(error = IOException("sin red")), FakeHealthDao(cached))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        val state = vm.uiState.value
        assertEquals("0.0.9", state.snapshot?.version)
        assertNotNull(state.error)
    }

    @Test fun `retry despues de un error exitoso limpia el error`() = runTest {
        val api = FakeHealthApi(error = IOException("sin red"))
        val vm = viewModel(api, FakeHealthDao())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        api.error = null
        vm.retry()

        val state = vm.uiState.value
        assertNull(state.error)
        assertEquals("0.1.0", state.snapshot?.version)
    }

    // Review Focus 3: tocar "Reintentar" varias veces no lanza refreshes en paralelo.
    @Test fun `retry mientras refresca no lanza otro refresh`() = runTest {
        val api = FakeHealthApi().apply { gate = CompletableDeferred() }
        val vm = viewModel(api, FakeHealthDao())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        assertTrue(vm.uiState.value.isRefreshing)
        vm.retry()
        vm.retry()
        api.gate!!.complete(Unit)

        assertEquals(1, api.calls)
        assertFalse(vm.uiState.value.isRefreshing)
    }

    // El banner offline no debe desaparecer mientras un retry está en curso.
    @Test fun `retry conserva el error mientras refresca`() = runTest {
        val api = FakeHealthApi(error = IOException("sin red"))
        val vm = viewModel(api, FakeHealthDao(cached))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        assertNotNull(vm.uiState.value.error)

        api.gate = CompletableDeferred()
        vm.retry()

        assertNotNull(vm.uiState.value.error)
        assertTrue(vm.uiState.value.isRefreshing)
        api.gate!!.complete(Unit)
    }
}
