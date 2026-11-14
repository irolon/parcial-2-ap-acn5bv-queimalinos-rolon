package com.fittrainer.data.gamification

import com.fittrainer.data.routine.parseDays
import com.fittrainer.testing.fakes.gamification.progressDto
import java.time.DayOfWeek
import org.junit.Assert.assertEquals
import org.junit.Test

class GamificationMapperTest {
    @Test fun losDiasAsignadosDelServidorDanLosMismosDayOfWeekQueLasRutinas() {
        val dto = progressDto(assignedDays = listOf("monday", "thursday"))
        val snapshot = dto.toSnapshotEntity("u1", 1_000L).toDomain()
        assertEquals(setOf(DayOfWeek.MONDAY, DayOfWeek.THURSDAY), snapshot.assignedDays)
        assertEquals(parseDays(listOf("monday", "thursday")), snapshot.assignedDays)
    }

    @Test fun sinDiasAsignadosLaFotoQuedaVacia() {
        assertEquals(emptySet<DayOfWeek>(), progressDto().toSnapshotEntity("u1", 1_000L).toDomain().assignedDays)
    }
}
