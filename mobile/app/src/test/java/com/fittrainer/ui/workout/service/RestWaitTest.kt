package com.fittrainer.ui.workout.service

import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.currentTime
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

/** Orden del fin del descanso en el service: nada suspende entre el fin de la espera y el aviso. */
@OptIn(ExperimentalCoroutinesApi::class)
class RestWaitTest {

    private val events = mutableListOf<String>()

    @Test fun `la carga se calcula antes de esperar y al terminar avisa y despues marca el fin`() = runTest {
        launch {
            awaitRestEnd(
                30_000,
                prepare = { events += "prepare@$currentTime"; "próxima" },
                notify = { events += "notify:$it@$currentTime" },
                ended = { events += "ended@$currentTime" },
            )
        }
        runCurrent()
        assertEquals(listOf("prepare@0"), events)

        advanceTimeBy(30_001)
        assertEquals(listOf("prepare@0", "notify:próxima@30000", "ended@30000"), events)
    }

    @Test fun `si la cancelan durante la espera no avisa ni marca el fin`() = runTest {
        // El fin sigue marcado como pendiente: la emisión siguiente (restJustEnded) es la que avisa.
        val job = launch {
            awaitRestEnd(30_000, prepare = { "próxima" }, notify = { events += "notify" }, ended = { events += "ended" })
        }
        advanceTimeBy(10_000)
        job.cancel()
        advanceTimeBy(30_000)

        assertEquals(emptyList<String>(), events)
    }

    @Test fun `descanso ya vencido no calcula ni avisa pero marca el fin`() = runTest {
        awaitRestEnd(0, prepare = { events += "prepare"; "x" }, notify = { events += "notify" }, ended = { events += "ended" })

        assertEquals(listOf("ended"), events)
    }

    @Test fun `si falla leer el historial avisa igual con la carga del plan`() = runTest {
        awaitRestEnd(
            30_000,
            prepare = { historyOrNull<String> { error("Room falló al leer") } ?: "plan" },
            notify = { events += "notify:$it" },
            ended = { events += "ended" },
        )

        assertEquals(listOf("notify:plan", "ended"), events)
    }

    @Test(expected = CancellationException::class)
    fun `la cancelacion no se traga al leer el historial`() = runTest {
        historyOrNull<String> { throw CancellationException("cancelada") }
    }
}
