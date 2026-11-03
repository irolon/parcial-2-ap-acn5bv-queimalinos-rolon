package com.fittrainer.data.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryExerciseDto
import com.fittrainer.data.api.history.HistorySetDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.api.history.NamedRefDto
import org.junit.Assert.assertEquals
import org.junit.Test

class HistoryMapperTest {
    private val base = 1_793_322_000_000L // 2026-10-30T01:00:00Z

    @Test fun `fechas de Supabase con offset y microsegundos`() {
        val dto = HistorySummaryDto("a", "2026-10-30T01:00:00.123456+00:00", "2026-10-30T01:50:00.5+00:00")
        val entity = dto.toEntity("u1", inLatest = true, detailLoaded = false)
        assertEquals(base + 123, entity.startedAt)
        assertEquals(base + 50 * 60_000 + 500, entity.finishedAt)
    }

    @Test fun `executed_at de una serie con offset y microsegundos`() {
        val set = HistorySetDto("s1", 1, 10, 40.0, "2026-10-30T01:05:00.654321+00:00")
        val detail = HistoryDetailDto("a", "2026-10-30T01:00:00+00:00", exercises = listOf(HistoryExerciseDto(NamedRefDto("e", "Press"), sets = listOf(set))))
        assertEquals(base + 5 * 60_000 + 654, detail.setEntities().single().executedAt)
    }

    @Test fun `el descanso real y el del plan pasan al cache, y sin el campo quedan null`() {
        val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
        val detail = json.decodeFromString<HistoryDetailDto>(
            """{"id":"a","started_at":"2026-10-30T01:00:00Z","exercises":[{"exercise":{"id":"e","name":"Press"},
            "planned":{"sets":4,"rest_seconds":90},"sets":[
            {"id":"s1","set_number":1,"executed_at":"2026-10-30T01:05:00Z","rest_seconds":120},
            {"id":"s2","set_number":2,"executed_at":"2026-10-30T01:08:00Z"}]}]}""",
        )
        assertEquals(90, detail.exerciseEntities().single().plannedRestSeconds)
        assertEquals(listOf(120, null), detail.setEntities().map { it.restSeconds })
    }

    @Test fun `fechas con Z siguen andando`() {
        val dto = HistorySummaryDto("a", "2026-10-30T01:00:00Z", "2026-10-30T01:50:00.250Z")
        val entity = dto.toEntity("u1", inLatest = true, detailLoaded = false)
        assertEquals(base, entity.startedAt)
        assertEquals(base + 50 * 60_000 + 250, entity.finishedAt)
    }

    @Test fun `offset distinto de cero se respeta`() {
        val dto = HistorySummaryDto("a", "2026-10-29T22:00:00-03:00")
        assertEquals(base, dto.toEntity("u1", inLatest = true, detailLoaded = false).startedAt)
    }
}
