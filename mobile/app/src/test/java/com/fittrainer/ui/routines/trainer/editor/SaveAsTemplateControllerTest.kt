package com.fittrainer.ui.routines.trainer.editor

import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.templates.trainer.SAVED_AS_TEMPLATE
import com.fittrainer.ui.templates.trainer.SAVE_EXERCISES_UNAVAILABLE
import java.time.Clock
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SaveAsTemplateControllerTest {

    private val api = FakeTrainerTemplatesApi()
    private val routines = TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val repo = TrainerTemplatesRepository(api, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private var offline = false
    private val notices = mutableListOf<String>()

    private fun TestScope.controller() =
        SaveAsTemplateController(repo, this, "r1", { "t1" }, { offline }, { notices += it }).apply { open("Push") }

    @Test fun `arranca con el nombre de la rutina y guarda con el nivel elegido`() = runTest {
        val c = controller()
        assertEquals("Push", c.state.value!!.name)
        c.onLevel("advanced")
        c.save()
        advanceUntilIdle()
        assertEquals("advanced", api.fromRoutines.single().level)
        assertEquals("r1", api.fromRoutines.single().routineId)
        assertNull(c.state.value)
        assertEquals(listOf(SAVED_AS_TEMPLATE), notices)
    }

    @Test fun `nombre corto no se manda`() = runTest {
        val c = controller()
        c.onName(" P ")
        c.save()
        assertTrue(c.state.value!!.nameError != null)
        assertTrue(api.fromRoutines.isEmpty())
    }

    @Test fun `sin red avisa y no llama`() = runTest {
        val c = controller()
        offline = true
        c.save()
        assertEquals(NEEDS_NETWORK, c.state.value!!.message)
        assertTrue(api.fromRoutines.isEmpty())
    }

    private fun TestScope.failWith(e: Throwable) = controller().also {
        api.error = e
        it.save()
        advanceUntilIdle()
    }

    @Test fun `un 400 de otro campo muestra su detalle y no el generico`() = runTest {
        val body = """{"error":{"code":"VALIDATION_ERROR","message":"Error de validación","details":[""" +
            """{"field":"routine_id","message":"La rutina tiene que tener entre 1 y 50 ejercicios"}]}}"""
        val c = failWith(httpError(400, body))
        assertEquals("La rutina tiene que tener entre 1 y 50 ejercicios", c.state.value!!.message)
        assertNull(c.state.value!!.nameError)
    }

    @Test fun `un 400 del nombre va debajo del campo`() = runTest {
        val body = """{"error":{"code":"VALIDATION_ERROR","message":"Error de validación","details":[""" +
            """{"field":"name","message":"El nombre debe tener entre 2 y 120 caracteres"}]}}"""
        val c = failWith(httpError(400, body))
        assertEquals("El nombre debe tener entre 2 y 120 caracteres", c.state.value!!.nameError)
        assertNull(c.state.value!!.message)
    }

    @Test fun `un 403 dice que un ejercicio ya no esta disponible y no habla del alumno`() = runTest {
        val c = failWith(httpError(403))
        assertEquals(SAVE_EXERCISES_UNAVAILABLE, c.state.value!!.message)
    }
}
