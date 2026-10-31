package com.fittrainer.data.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryExerciseDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySetDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.api.history.NamedRefDto
import com.fittrainer.data.db.workout.history.HistoryExerciseEntity
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HistoryRepositoryBackfillTest {
    private val api = FakeSessionApi()
    private val session = FakeStudentSession()
    private val dao = FakeHistoryDao()
    private val repository = HistoryRepository(api, dao, FakeWorkoutDao()) { session }

    private val summary = HistorySummaryDto(
        "s1", "2026-10-02T12:00:00Z", "2026-10-02T12:50:00Z", 50, NamedRefDto("r1", "Push"), sets = 3, volumeKg = 300.0,
    )
    private val detail = HistoryDetailDto(
        "s1", "2026-10-02T12:00:00Z", exercises = listOf(
            HistoryExerciseDto(NamedRefDto("e1", "Press"), sets = listOf(HistorySetDto("s1-1", 1, 10, 40.0, "2026-10-02T12:05:00Z"))),
        ),
    )

    @Test fun refrescoVuelveABajarDetallesSinIdDeEjercicio() = runTest {
        api.historyPages = mapOf(1 to HistoryPageDto(listOf(summary), HistoryMetaDto(1, 1, 20, 1)))
        api.details = mapOf("s1" to detail)
        // Guardado antes de la v9: mismo resumen que la API, detalle cargado, ejercicio sin exerciseId.
        dao.upsertSessions(listOf(summary.toEntity("u1", inLatest = true, detailLoaded = true)))
        dao.insertExercises(listOf(HistoryExerciseEntity("s1", 0, "Press", null, null, null, null, false, exerciseId = null)))

        assertTrue(repository.refresh("u1").isSuccess)
        assertEquals(listOf("s1"), api.detailCalls)
        assertEquals("e1", dao.state.value.exercises.single().exerciseId)

        api.detailCalls.clear()
        assertTrue(repository.refresh("u1").isSuccess)
        assertTrue(api.detailCalls.isEmpty())
    }
}
