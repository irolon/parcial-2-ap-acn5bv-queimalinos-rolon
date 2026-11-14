package com.fittrainer.data.gamification

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

/** La cuenta local: sesiones (foto + extras) y racha. */
data class LocalCounts(val sessions: Int, val streak: LocalStreak)

/**
 * Una sesión llega al servidor recién terminada, así que las que cerraron después de la foto seguro no están en ella
 * (spec §3.3). Las anteriores que todavía no subieron no se suman: se cuenta de menos, nunca de más.
 * La sesión cuenta el día en que empezó (el backend fecha por el inicio). Si la rutina cambió desde la foto, el
 * servidor recalcularía con otros días: la racha no suma extras (solo puede bajar); las sesiones sí suman siempre.
 */
fun localCounts(snapshot: Snapshot, finished: List<FinishedSession>, roomAssignedDays: Set<DayOfWeek>, today: LocalDate): LocalCounts {
    val extras = finished.filter { it.finishedAt > snapshot.fetchedAt }
    val streakExtras = if (roomAssignedDays == snapshot.assignedDays) extras.map { businessDate(it.startedAt) } else emptyList()
    return LocalCounts(snapshot.sessionsCount + extras.size, localStreak(snapshot, streakExtras, snapshot.assignedDays, today))
}

/** Progreso con la cuenta local: sesiones y racha más larga (como el longestStreak del backend); el resto, el de la foto. */
fun Achievement.localCurrent(counts: LocalCounts): Int = when {
    unlockedAt != null -> target
    criteriaType == CRITERIA_SESSIONS -> minOf(target, maxOf(current, counts.sessions))
    criteriaType == CRITERIA_STREAK -> minOf(target, maxOf(current, counts.streak.longest))
    else -> current
}

/** Los únicos tipos de criterio que el celular cuenta: los demás los otorga el servidor. */
private fun Achievement.countedLocally(): Boolean = criteriaType == CRITERIA_SESSIONS || criteriaType == CRITERIA_STREAK

/** Logros que la cuenta local da por cumplidos y el servidor todavía no otorgó (solo los que el celular sabe contar). */
fun localUnlocks(achievements: List<Achievement>, counts: LocalCounts): List<Achievement> = achievements.filter {
    it.unlockedAt == null && it.countedLocally() && it.localCurrent(counts) >= it.target
}

fun buildSummary(
    snapshot: Snapshot,
    achievements: List<Achievement>,
    challenges: List<Challenge>,
    finished: List<FinishedSession>,
    roomAssignedDays: Set<DayOfWeek>,
    today: LocalDate,
): GamificationSummary {
    val counts = localCounts(snapshot, finished, roomAssignedDays, today)
    return GamificationSummary(
        currentStreak = counts.streak.current,
        longestStreak = counts.streak.longest,
        prSessions = snapshot.prSessions,
        fullWeeks = snapshot.fullWeeks,
        achievements = achievements.map { a ->
            val current = a.localCurrent(counts)
            AchievementView(a, current, awaitingSync = a.unlockedAt == null && a.countedLocally() && current >= a.target)
        },
        challenges = challenges,
        fetchedAt = Instant.ofEpochMilli(snapshot.fetchedAt),
    )
}
