package com.fittrainer.data.sync

import com.fittrainer.data.api.SessionSetDto
import com.fittrainer.data.db.workout.WorkoutSetEntity
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El descanso real de cada serie viaja como `rest_seconds` en POST /sessions/:id/sets. */
class SessionSetDtoTest {

    private val json = Json { ignoreUnknownKeys = true }
    private val set = WorkoutSetEntity("s1", "w1", 0, "ex-0", null, "re-0", 1, 40.0, 8, 0L)

    @Test fun `la serie lleva su descanso real`() {
        val dto = set.copy(restSeconds = 95).toDto()
        assertEquals(95, dto.restSeconds)
        assertTrue(json.encodeToString(dto).contains("\"rest_seconds\":95"))
    }

    @Test fun `sin descanso no se manda el campo y el backend lo toma como null`() {
        val dto = set.toDto()
        assertNull(dto.restSeconds)
        assertFalse(json.encodeToString<SessionSetDto>(dto).contains("rest_seconds"))
    }
}
