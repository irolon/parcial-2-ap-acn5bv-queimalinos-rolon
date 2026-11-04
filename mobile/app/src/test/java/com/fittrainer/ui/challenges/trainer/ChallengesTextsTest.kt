package com.fittrainer.ui.challenges.trainer

import com.fittrainer.data.challenges.trainer.BatchAssignResult
import com.fittrainer.data.challenges.trainer.StudentChallenge
import java.time.Instant
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class ChallengesTextsTest {

    private val zone = ZoneId.of("America/Argentina/Buenos_Aires")

    private fun item(status: String, endsAt: String, completedAt: String? = null) = StudentChallenge(
        "a1", "c1", "Uno", "sessions_count", 12.0, 5.0, 41.7, status,
        Instant.parse("2026-11-01T12:00:00Z"), Instant.parse(endsAt), completedAt?.let(Instant::parse),
    )

    @Test fun `la meta segun el tipo`() {
        assertEquals("12 sesiones · 30 días", goalLine("sessions_count", 12.0, 30))
        assertEquals("1 sesión · 1 día", goalLine("sessions_count", 1.0, 1))
        assertEquals("14 días de racha · 30 días", goalLine("streak", 14.0, 30))
        assertEquals("10.000 kg de volumen · 28 días", goalLine("volume", 10_000.0, 28))
        assertEquals("Llegar a 72,5 kg", goalLine("weight_target", 72.5, null))
    }

    @Test fun `el avance en peso no dice x de y`() {
        assertEquals("Peso actual 80 kg · meta 75 kg", progressLabel("weight_target", 80.0, 75.0))
        assertEquals("5 de 12 sesiones", progressLabel("sessions_count", 5.0, 12.0))
        assertEquals("2.500 de 10.000 kg de volumen", progressLabel("volume", 2_500.0, 10_000.0))
    }

    @Test fun `los estados`() {
        assertEquals(listOf("Activo", "Cumplido", "Vencido", "Abandonado"), listOf("active", "completed", "failed", "abandoned").map(::statusLabel))
    }

    @Test fun `dias que quedan por dia calendario de Buenos Aires`() {
        // 1/11 23:30 en Buenos Aires (2/11 02:30 UTC); vence el 3/11 a las 09:00 de Buenos Aires.
        val now = Instant.parse("2026-11-02T02:30:00Z")
        assertEquals("Quedan 2 días", timeLabel(item("active", "2026-11-03T12:00:00Z"), now, zone))
        assertEquals("Queda 1 día", timeLabel(item("active", "2026-11-02T12:00:00Z"), now, zone))
        assertEquals("Termina hoy", timeLabel(item("active", "2026-11-01T20:00:00Z"), now, zone))
    }

    @Test fun `terminados muestran la fecha`() {
        val now = Instant.parse("2026-12-20T12:00:00Z")
        assertEquals("Cumplido el 15 nov", timeLabel(item("completed", "2026-12-01T12:00:00Z", "2026-11-15T12:00:00Z"), now, zone))
        assertEquals("Terminó el 1 dic", timeLabel(item("failed", "2026-12-01T12:00:00Z"), now, zone))
    }

    @Test fun `la barra va de 0 a 1`() {
        assertEquals(0.5f, progressFraction(50.0))
        assertEquals(1f, progressFraction(130.0))
        assertEquals(0f, progressFraction(-3.0))
    }

    @Test fun `el resumen del lote nunca dice asignado a 0`() {
        val names = mapOf("s1" to "Ana", "s2" to "Beto", "s3" to "Caro")
        assertEquals(
            "Ya lo tenían activo: Ana, Beto",
            batchSummary(BatchAssignResult(emptyList(), listOf("s1", "s2"), emptyList())) { names.getValue(it) },
        )
        assertEquals(
            "Asignado a 1 alumno\nYa no están en tu lista: Caro",
            batchSummary(BatchAssignResult(listOf("s1"), emptyList(), listOf("s3"))) { names.getValue(it) },
        )
        assertEquals("Asignado a 2 alumnos", batchSummary(BatchAssignResult(listOf("s1", "s2"), emptyList(), emptyList())) { it })
    }

    @Test fun `el boton cuenta los elegidos`() {
        assertEquals("Asignar", assignButton(0))
        assertEquals("Asignar (3)", assignButton(3))
    }
}
