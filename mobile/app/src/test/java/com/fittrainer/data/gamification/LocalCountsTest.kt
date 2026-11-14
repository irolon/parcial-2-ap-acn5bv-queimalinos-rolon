package com.fittrainer.data.gamification

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalCountsTest {
    private val fetchedAt = Instant.parse("2026-10-30T12:00:00Z").toEpochMilli() // 09:00 AR del viernes 30
    private val today = LocalDate.of(2026, 10, 30)
    private val snapshot = Snapshot(6, 6, LocalDate.of(2026, 10, 29), 9, 2, 1, fetchedAt)

    private fun achievement(code: String, type: String?, current: Int, target: Int, unlocked: Boolean = false) =
        Achievement(code, code, null, null, type, current, target, if (unlocked) Instant.EPOCH else null)

    @Test fun soloSumanLasSesionesQueCerraronDespuesDeLaFoto() {
        val counts = localCounts(snapshot, listOf(FinishedSession(fetchedAt - 61_000, fetchedAt - 1_000), FinishedSession(fetchedAt - 60_000, fetchedAt + 1_000)), emptySet(), today)
        assertEquals(10, counts.sessions)
        assertEquals(LocalStreak(7, 7), counts.streak)
    }

    @Test fun sinExtrasEsLaFoto() {
        val counts = localCounts(snapshot, listOf(FinishedSession(fetchedAt - 61_000, fetchedAt - 1_000)), emptySet(), today)
        assertEquals(9, counts.sessions)
        assertEquals(LocalStreak(6, 6), counts.streak)
    }

    @Test fun elProgresoLocalUsaSesionesYLaRachaMasLargaRecortados() {
        val counts = LocalCounts(sessions = 12, streak = LocalStreak(current = 2, longest = 8))
        assertEquals(10, achievement("S10", CRITERIA_SESSIONS, 9, 10).localCurrent(counts))
        assertEquals(7, achievement("ST7", CRITERIA_STREAK, 6, 7).localCurrent(counts))
        assertEquals(0, achievement("PR", "pr_count", 0, 1).localCurrent(counts))
        assertEquals(4, achievement("FW", "full_week", 4, 4, unlocked = true).localCurrent(counts))
    }

    @Test fun localUnlocksSoloDevuelveSesionesYRachaBloqueadosQueLlegaron() {
        val counts = LocalCounts(sessions = 10, streak = LocalStreak(7, 7))
        val list = listOf(
            achievement("S10", CRITERIA_SESSIONS, 9, 10),
            achievement("S50", CRITERIA_SESSIONS, 9, 50),
            achievement("ST7", CRITERIA_STREAK, 6, 7),
            achievement("FIRST", CRITERIA_SESSIONS, 1, 1, unlocked = true),
            achievement("PR", "pr_count", 1, 1),
        )
        assertEquals(listOf("S10", "ST7"), localUnlocks(list, counts).map { it.code })
    }

    @Test fun elResumenMarcaLoQueEsperaAlServidor() {
        val achievements = listOf(achievement("ST7", CRITERIA_STREAK, 6, 7), achievement("FIRST", CRITERIA_SESSIONS, 1, 1, unlocked = true))
        val summary = buildSummary(snapshot, achievements, emptyList(), listOf(FinishedSession(fetchedAt - 60_000, fetchedAt + 1_000)), emptySet(), today)
        assertEquals(7, summary.currentStreak)
        assertEquals(2, summary.prSessions)
        val streak = summary.achievements.first()
        assertEquals(7, streak.current)
        assertTrue(streak.awaitingSync)
        assertFalse(summary.achievements[1].awaitingSync)
    }

    @Test fun laSesionQueCruzaLaMedianocheCuentaElDiaQueEmpezo() {
        val s = snapshot.copy(lastSessionDate = LocalDate.of(2026, 10, 30))
        // 30/10 23:40 y 31/10 00:15 en Buenos Aires: el backend la fecha por el inicio (30/10), no suma un día.
        val cruza = FinishedSession(Instant.parse("2026-10-31T02:40:00Z").toEpochMilli(), Instant.parse("2026-10-31T03:15:00Z").toEpochMilli())
        val counts = localCounts(s, listOf(cruza), emptySet(), LocalDate.of(2026, 10, 31))
        assertEquals(10, counts.sessions)
        assertEquals(LocalStreak(6, 6), counts.streak)
    }

    @Test fun siCambioLaRutinaDesdeLaFotoLaRachaNoSumaExtrasPeroLasSesionesSi() {
        val s = snapshot.copy(assignedDays = setOf(DayOfWeek.FRIDAY))
        val counts = localCounts(s, listOf(FinishedSession(fetchedAt - 60_000, fetchedAt + 1_000)), setOf(DayOfWeek.MONDAY), today)
        assertEquals(10, counts.sessions)
        assertEquals(LocalStreak(6, 6), counts.streak)
    }

    @Test fun elPrConProgresoCumplidoNoSeMarcaAlSincronizar() {
        val summary = buildSummary(snapshot, listOf(achievement("PR", "pr_count", 1, 1)), emptyList(), emptyList(), emptySet(), today)
        assertFalse(summary.achievements.single().awaitingSync)
    }
}
