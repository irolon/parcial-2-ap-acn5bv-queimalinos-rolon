package com.fittrainer.ui.routines.trainer.ai

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.toDomain
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.testing.fakes.trainerai.proposalDto
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E15: un ViewModel revivo con la propuesta guardada no genera otra aunque se toque antes de la primera emisión. */
@OptIn(ExperimentalCoroutinesApi::class)
class AiRoutineReviveTest {
    @get:Rule val main = MainDispatcherRule(StandardTestDispatcher())

    @Test fun `un toque antes de la primera emision no genera sobre la propuesta restaurada`() = runTest {
        val aiApi = FakeTrainerAiApi()
        val routines = TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC())
        val templates = TrainerTemplatesRepository(FakeTrainerTemplatesApi(), FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
        val details = TrainerStudentDetailRepository(FakeStudentDetailApi(), FakeTrainerStudentDetailDao(), Clock.systemUTC())
        val form = AiRoutineForm(goal = "strength", level = "beginner", prefilled = true)
        val handle = SavedStateHandle(mapOf(
            STUDENT_ID_ARG to "s1",
            "ai_form" to Json.encodeToString(form),
            "ai_proposal" to Json.encodeToString(proposalDto(2).toDomain()),
        ))
        val vm = AiRoutineViewModel(TrainerAiRepository(aiApi), templates, routines, details, FakeTrainerSession(), FakeConnectivityObserver(), Clock.systemUTC(), handle)
        vm.onGenerate()
        advanceUntilIdle()
        assertTrue(aiApi.requests.isEmpty())
    }
}
