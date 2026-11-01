package com.fittrainer.ui.refresh

import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

/** El grueso del comportamiento lo cubren los tests de Hoy (TodayViewModelTest y TodayViewModelRefreshTest). */
@OptIn(ExperimentalCoroutinesApi::class)
class RefreshControllerTest {

    private val online = MutableSharedFlow<Boolean>(replay = 1).apply { tryEmit(true) }

    @Test fun `un pull con un pedido en vuelo no dispara otro y avisa con el texto de la pantalla`() = runTest {
        val gate = CompletableDeferred<Unit>()
        var calls = 0
        val controller = RefreshController(backgroundScope, online, flowOf("u1"), "falló acá") {
            calls++
            gate.await()
            Result.failure(IOException("caído"))
        }
        controller.start()
        runCurrent()
        controller.pull()
        runCurrent()
        assertEquals(1, calls)

        gate.complete(Unit)
        runCurrent()
        assertEquals(1, calls)
        assertEquals("falló acá", controller.state.value.notice)
        assertFalse(controller.state.value.isRefreshing)
    }

    @Test fun `el automatico que falla no avisa`() = runTest {
        val controller = RefreshController(backgroundScope, online, flowOf("u1"), "falló") {
            Result.failure(IOException("caído"))
        }
        controller.start()
        runCurrent()
        assertNull(controller.state.value.notice)
    }
}
