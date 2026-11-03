package com.fittrainer.ui.routines.trainer.editor

import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.templates.trainer.SAVED_AS_TEMPLATE
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
}
