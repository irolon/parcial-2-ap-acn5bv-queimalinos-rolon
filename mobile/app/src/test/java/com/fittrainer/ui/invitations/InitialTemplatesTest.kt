package com.fittrainer.ui.invitations

import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TemplateSummary
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.plus
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class InitialTemplatesTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeTrainerTemplatesApi()
    private val source = InitialTemplatesSource(
        TrainerTemplatesRepository(
            api, FakeTrainerTemplatesDao(), TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC()), Clock.systemUTC(),
        ),
        FakeTrainerSession(),
    )

    private fun summary(days: Int, level: String?) =
        TemplateSummary("t", "Push A", null, level, List(days) { "monday" }, 3, null)

    @Test fun `la etiqueta lleva dias y nivel`() {
        assertEquals("Push A · 4 días · Intermedio", templateOptionLabel(summary(4, "intermediate")))
        assertEquals("Push A · 1 día", templateOptionLabel(summary(1, null)))
    }

    @Test fun `con la lista bajada da Ready`() = runTest {
        val choices = source.choices(backgroundScope + UnconfinedTestDispatcher(testScheduler))
        advanceUntilIdle()
        val ready = choices.value as TemplateChoices.Ready
        assertEquals(listOf("tp1"), ready.templates.map { it.id })
    }

    @Test fun `sin cache y con el refresh fallido da Failed`() = runTest {
        api.error = IOException("sin red")
        val choices = source.choices(backgroundScope + UnconfinedTestDispatcher(testScheduler))
        advanceUntilIdle()
        assertEquals(TemplateChoices.Failed, choices.value)
    }

    @Test fun `un refresh que sale bien despues de fallar da Ready`() = runTest {
        api.error = IOException("sin red")
        val choices = source.choices(backgroundScope + UnconfinedTestDispatcher(testScheduler))
        advanceUntilIdle()
        api.error = null
        source.refresh()
        advanceUntilIdle()
        assertTrue(choices.value is TemplateChoices.Ready)
    }
}
