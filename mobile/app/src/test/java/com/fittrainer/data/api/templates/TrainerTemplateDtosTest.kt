package com.fittrainer.data.api.templates

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerTemplateDtosTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test fun `from-routine sin nivel manda level null explicito`() {
        assertTrue("\"level\":null" in json.encodeToString(FromRoutineRequest("r", "n", null)))
    }
}
