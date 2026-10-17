package com.fittrainer.ui.library

import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.library.libraryDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LibraryViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeExerciseApi(LibraryResponse(listOf(libraryDto("ex-1", "chest"), libraryDto("ex-2", "legs"))))
    private val connectivity = FakeConnectivityObserver()
    private val repo = LibraryRepository(api, FakeLibraryDao(), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC))
    // lazy: el viewModelScope se crea con el Main que instala la regla, no con el real.
    private val vm by lazy { LibraryViewModel(repo, FakeStudentSession(), connectivity) }

    // Igual que TodayViewModelTest: la colección comparte el scheduler del test.
    private fun TestScope.collect() =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    @Test fun `al entrar refresca y muestra la biblioteca con sus chips`() = runTest {
        collect()
        vm.onStart()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertEquals(listOf("ex-1", "ex-2"), state.exercises.map { it.id })
        assertEquals(listOf("chest", "legs"), state.groups)
    }

    @Test fun `elegir un grupo filtra y Todos lo saca`() = runTest {
        collect()
        vm.onStart()
        advanceUntilIdle()

        vm.onSelectGroup("legs")
        advanceUntilIdle()
        assertEquals(listOf("ex-2"), vm.uiState.value.exercises.map { it.id })

        vm.onSelectGroup(null)
        advanceUntilIdle()
        assertEquals(2, vm.uiState.value.exercises.size)
    }

    @Test fun `el pull que falla avisa y conserva lo guardado`() = runTest {
        collect()
        vm.onStart()
        advanceUntilIdle()
        api.error = IOException("sin red")

        vm.onPullToRefresh()
        advanceUntilIdle()

        assertEquals(LIBRARY_REFRESH_FAILED, vm.uiState.value.notice)
        assertEquals(2, vm.uiState.value.exercises.size)
    }

    @Test fun `el refresh automatico que falla no avisa`() = runTest {
        collect()
        api.error = IOException("sin red")
        connectivity.state.value = false

        vm.onStart()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertNull(state.notice)
        assertTrue(state.isOffline)
        assertTrue(!state.everSynced)
    }

    @Test fun `nunca dos pedidos a la red a la vez`() = runTest {
        collect()
        api.gate = CompletableDeferred()

        vm.onStart()
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertEquals(1, api.calls)

        api.gate?.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, api.calls)
    }

    @Test fun `al volver la red refresca y aparece la biblioteca`() = runTest {
        collect()
        api.error = IOException("sin red")
        connectivity.state.value = false
        vm.onStart()
        advanceUntilIdle()
        val before = api.calls

        api.error = null
        connectivity.state.value = true
        advanceUntilIdle()

        assertTrue(api.calls > before)
        assertEquals(2, vm.uiState.value.exercises.size)
    }

    @Test fun `un pedido colgado se reinicia al volver la red`() = runTest {
        collect()
        api.gate = CompletableDeferred()
        vm.onStart()
        advanceUntilIdle()
        assertEquals(1, api.calls)

        connectivity.state.value = false
        advanceUntilIdle()
        connectivity.state.value = true
        advanceUntilIdle()

        assertEquals(2, api.calls)
    }

    @Test fun `un pull durante el refresh automatico que despues falla avisa`() = runTest {
        collect()
        vm.onStart()
        advanceUntilIdle()
        api.gate = CompletableDeferred()
        api.error = IOException("sin red")
        vm.onStart()
        advanceUntilIdle()

        vm.onPullToRefresh()
        api.gate?.complete(Unit)
        advanceUntilIdle()

        assertEquals(LIBRARY_REFRESH_FAILED, vm.uiState.value.notice)
    }
}
