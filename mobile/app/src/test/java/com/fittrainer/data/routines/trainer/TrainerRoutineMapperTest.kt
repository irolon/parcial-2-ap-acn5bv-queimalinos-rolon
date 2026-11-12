package com.fittrainer.data.routines.trainer

import com.fittrainer.data.api.routines.TrainerRoutineDetailDto
import com.fittrainer.data.api.routines.TrainerRoutineSummaryDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TrainerRoutineMapperTest {

    @Test fun `el nivel del resumen llega hasta el dominio`() {
        val dto = TrainerRoutineSummaryDto(id = "r", studentId = "s", name = "Push", level = "advanced")
        assertEquals("advanced", dto.toEntity("t").toDomain().level)
    }

    @Test fun `el nivel del detalle llega hasta el dominio`() {
        val dto = TrainerRoutineDetailDto(id = "r", studentId = "s", name = "Push", level = "beginner")
        assertEquals("beginner", dto.toEntity("t").toDomain().level)
    }

    @Test fun `un backend viejo sin level deja la rutina sin nivel`() {
        assertNull(TrainerRoutineSummaryDto(id = "r", studentId = "s", name = "Push").toEntity("t").toDomain().level)
    }
}
