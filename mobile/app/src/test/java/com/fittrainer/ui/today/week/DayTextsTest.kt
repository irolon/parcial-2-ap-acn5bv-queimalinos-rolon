package com.fittrainer.ui.today.week

import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant
import java.time.LocalDate

class DayTextsTest {
    private fun item(durationMin: Int? = 48, sets: Int = 18, volumeKg: Double = 2340.0, rpe: Int? = 7) = HistoryItem(
        id = "s1", startedAt = Instant.parse("2026-11-16T15:00:00Z"), durationMin = durationMin, routineName = "Empuje",
        sets = sets, volumeKg = volumeKg, rpe = rpe, hasPr = false, hasComment = false, origin = HistoryOrigin.SERVER,
    )

    @Test fun `proximo entreno manana`() =
        assertEquals("MAÑANA · MIÉRCOLES", nextTrainingLabel(LocalDate.of(2026, 11, 18), LocalDate.of(2026, 11, 17)))

    @Test fun `proximo entreno otro dia`() =
        assertEquals("JUEVES 19", nextTrainingLabel(LocalDate.of(2026, 11, 19), LocalDate.of(2026, 11, 17)))

    @Test fun `resumen de sesion completo`() = assertEquals("48 min · 18 series · 2.340 kg · RPE 7", sessionSummary(item()))

    @Test fun `resumen omite lo nulo`() {
        assertEquals("18 series · 2.340 kg", sessionSummary(item(durationMin = null, rpe = null)))
        assertEquals("1 serie", sessionSummary(item(durationMin = null, sets = 1, volumeKg = 0.0, rpe = null)))
    }

    @Test fun `etiqueta de dia pasado`() {
        val lunes = LocalDate.of(2026, 11, 16)
        assertEquals("LUNES 16 · ENTRENADO", pastDayLabel(lunes, PastDayKind.TRAINED))
        assertEquals("LUNES 16 · SIN ENTRENAR", pastDayLabel(lunes, PastDayKind.MISSED))
        assertEquals("LUNES 16 · DESCANSO", pastDayLabel(lunes, PastDayKind.REST))
    }

    @Test fun `etiqueta de dia futuro y racha y fila`() {
        assertEquals("JUEVES 19 · TE TOCA", futureDayLabel(LocalDate.of(2026, 11, 19)))
        assertEquals("Racha de 1 día", streakTitle(1))
        assertEquals("Racha de 5 días", streakTitle(5))
    }

    @Test fun `etiqueta despues`() = assertEquals("DESPUÉS · SÁBADO 21", afterLabel(LocalDate.of(2026, 11, 21)))
}
