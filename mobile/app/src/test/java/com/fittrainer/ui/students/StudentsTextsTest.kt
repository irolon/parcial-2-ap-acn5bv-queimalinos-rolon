package com.fittrainer.ui.students

import com.fittrainer.data.students.StudentStatus
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class StudentsTextsTest {

    private val today = LocalDate.of(2026, 11, 10)

    @Test fun `ultimo entreno en los bordes`() {
        assertEquals("Hoy", lastTrainingLabel(Instant.parse("2026-11-10T15:00:00Z"), today))
        assertEquals("Ayer", lastTrainingLabel(Instant.parse("2026-11-09T15:00:00Z"), today))
        assertEquals("Hace 2 días", lastTrainingLabel(Instant.parse("2026-11-08T15:00:00Z"), today))
        assertEquals("Nunca entrenó", lastTrainingLabel(null, today))
    }

    @Test fun `el dia del ultimo entreno es el argentino`() {
        // 2026-11-10 02:30Z = 09/11 23:30 en Argentina.
        assertEquals("Ayer", lastTrainingLabel(Instant.parse("2026-11-10T02:30:00Z"), today))
    }

    @Test fun `contador de la cabecera`() {
        assertEquals("4 ACTIVOS · 1 EN RIESGO", headerCounts(4, 1))
        assertEquals("1 ACTIVO · 0 EN RIESGO", headerCounts(1, 0))
        assertEquals("0 ACTIVOS · 0 EN RIESGO", headerCounts(0, 0))
    }

    @Test fun `subtitulo con y sin dias`() {
        assertEquals("Ganar masa muscular · 4 d", studentSubtitle("hypertrophy", 4))
        assertEquals("Ganar fuerza", studentSubtitle("strength", 0))
        assertEquals("Sin definir", studentSubtitle(null, 0))
    }

    @Test fun `etiquetas de estado`() {
        assertEquals("al día", statusLabel(StudentStatus.ACTIVE))
        assertEquals("en riesgo", statusLabel(StudentStatus.INACTIVE))
        assertEquals("nuevo", statusLabel(StudentStatus.NEW))
        assertEquals("de baja", statusLabel(StudentStatus.DISABLED))
    }

    @Test fun `actualizado hace`() {
        val now = Instant.parse("2026-11-10T15:00:00Z")
        assertEquals("Actualizado hace un momento", syncedAgo(now.minusSeconds(20), now))
        assertEquals("Actualizado hace 5 min", syncedAgo(now.minusSeconds(300), now))
        assertEquals("Actualizado hace 2 h", syncedAgo(now.minusSeconds(7_300), now))
        assertEquals("Actualizado hace 1 día", syncedAgo(now.minusSeconds(90_000), now))
        assertEquals("Actualizado hace 3 días", syncedAgo(now.minusSeconds(3 * 86_400), now))
    }

    @Test fun `iniciales`() {
        assertEquals("JP", initials("José Pérez"))
        assertEquals("A", initials("ana"))
        assertEquals("MG", initials("  María  Gómez López "))
        assertEquals("?", initials(" "))
    }
}
