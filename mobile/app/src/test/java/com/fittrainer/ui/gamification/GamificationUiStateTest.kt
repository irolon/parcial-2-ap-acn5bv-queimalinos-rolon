package com.fittrainer.ui.gamification

import com.fittrainer.data.gamification.Achievement
import com.fittrainer.data.gamification.AchievementView
import com.fittrainer.data.gamification.Challenge
import com.fittrainer.data.gamification.GamificationSummary
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GamificationUiStateTest {
    private val today = LocalDate.of(2026, 10, 30)

    private fun view(code: String, type: String, current: Int, target: Int, unlockedAt: String? = null, awaiting: Boolean = false) = AchievementView(
        Achievement(code, "Logro $code", "Desc", if (type == "streak") "streak" else "milestone", type, current, target, unlockedAt?.let(Instant::parse)),
        current, awaiting,
    )

    private fun challenge(status: String, goalType: String, current: Double, goal: Double, endsAt: String) = Challenge(
        "c-$status-$goalType", "Desafío", null, goalType, goal, current, current / goal * 100, status,
        Instant.parse("2026-10-01T10:00:00Z"), Instant.parse(endsAt), null,
    )

    private fun summary(achievements: List<AchievementView>, challenges: List<Challenge> = emptyList()) =
        GamificationSummary(3, 9, 2, 1, achievements, challenges, Instant.parse("2026-10-30T12:00:00Z"))

    @Test fun desbloqueadasPrimeroDeLaMasNuevaYDespuesLasMasCercanas() {
        val ready = readyState(summary(listOf(
            view("A", "sessions_count", 3, 10),
            view("B", "sessions_count", 1, 1, "2026-10-01T10:00:00Z"),
            view("C", "streak", 6, 7),
            view("D", "sessions_count", 10, 10, "2026-10-20T10:00:00Z"),
        )), today)
        assertEquals(listOf("D", "B", "C", "A"), ready.medals.map { it.code })
        assertEquals(listOf("D", "B"), ready.recent.map { it.code })
    }

    @Test fun textosDeLasMedallas() {
        val ready = readyState(summary(listOf(
            view("A", "sessions_count", 3, 10),
            view("B", "sessions_count", 1, 1, "2026-10-01T15:00:00Z"),
            view("C", "challenge", 0, 1),
            view("E", "streak", 7, 7, awaiting = true),
        )), today)
        val byCode = ready.medals.associateBy { it.code }
        assertEquals("3/10", byCode.getValue("A").progressLabel)
        assertEquals(0.3f, byCode.getValue("A").progress, 0.001f)
        assertEquals("1 oct", byCode.getValue("B").dateLabel)
        assertTrue(byCode.getValue("B").unlocked)
        assertEquals("Cumplí un desafío", byCode.getValue("C").progressLabel)
        assertFalse(byCode.getValue("C").showsBar)
        assertEquals("Se confirma al sincronizar", byCode.getValue("E").progressLabel)
    }

    @Test fun desafiosActivosYTerminadosConSusTextos() {
        val ready = readyState(summary(emptyList(), listOf(
            challenge("active", "sessions_count", 3.0, 12.0, "2026-11-08T12:00:00Z"),
            challenge("active", "volume", 2500.0, 10000.0, "2026-10-30T20:00:00Z"),
            challenge("completed", "streak", 14.0, 14.0, "2026-10-15T12:00:00Z"),
            challenge("failed", "weight_target", 80.5, 75.0, "2026-10-10T12:00:00Z"),
        )), today)
        assertEquals(listOf("3 de 12 sesiones", "2.500 de 10.000 kg de volumen"), ready.activeChallenges.map { it.progressLabel })
        assertEquals(listOf("Quedan 9 días", "Termina hoy"), ready.activeChallenges.map { it.timeLabel })
        assertEquals(listOf("Cumplido", "No se cumplió"), ready.finishedChallenges.map { it.timeLabel })
        assertEquals("Peso actual 80,5 kg · meta 75 kg", ready.finishedChallenges[1].progressLabel)
    }

    @Test fun quedaUnDiaEnSingular() {
        assertEquals("Queda 1 día", daysLeftLabel(LocalDate.of(2026, 10, 31), today))
    }

    @Test fun diasEnSingularYPlural() {
        assertEquals("1 día", daysLabel(1))
        assertEquals("0 días", daysLabel(0))
        assertEquals("7 días", daysLabel(7))
    }

    @Test fun sinResumenNoHayContenidoListo() {
        assertNull(contentOf(null, today).let { it as? GamificationContent.Ready })
        assertEquals(GamificationContent.NeverSynced, contentOf(null, today))
    }
}
