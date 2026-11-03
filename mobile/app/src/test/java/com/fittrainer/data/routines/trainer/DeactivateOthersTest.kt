package com.fittrainer.data.routines.trainer

import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.routineDto
import java.time.Clock
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeactivateOthersTest {

    private val api = FakeTrainerRoutinesApi().apply {
        server["r2"] = routineDto("r2").copy(name = "Pull")
        server["new"] = routineDto("new").copy(name = "Nueva")
    }
    private val repo = TrainerRoutinesRepository(api, FakeTrainerRoutinesDao(), Clock.systemUTC())

    private fun summary(id: String, name: String, active: Boolean = true) =
        TrainerRoutineSummary(id, "s1", name, "strength", listOf("monday"), active, null)

    @Test fun `desactiva todas las activas menos la que se queda`() = runTest {
        val failed = repo.deactivateOthers("t1", listOf(summary("r1", "Push"), summary("r2", "Pull"), summary("new", "Nueva")), keepId = "new")
        assertTrue(failed.isEmpty())
        assertFalse(api.server.getValue("r1").active)
        assertFalse(api.server.getValue("r2").active)
        assertTrue(api.server.getValue("new").active)
    }

    @Test fun `devuelve los nombres que fallaron y sigue con las demas`() = runTest {
        api.updateError = httpError(500)
        val failed = repo.deactivateOthers("t1", listOf(summary("r1", "Push"), summary("r2", "Pull")), keepId = "new")
        assertEquals(listOf("Push", "Pull"), failed)
    }

    @Test fun `sin anteriores activas no llama`() = runTest {
        api.updateError = httpError(500)
        val failed = repo.deactivateOthers("t1", listOf(summary("r1", "Push", active = false)), keepId = "new")
        assertTrue(failed.isEmpty())
    }
}
