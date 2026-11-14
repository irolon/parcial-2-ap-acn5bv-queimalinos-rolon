package com.fittrainer.ui.gamification

import com.fittrainer.data.gamification.AchievementView
import com.fittrainer.data.gamification.BUSINESS_ZONE
import com.fittrainer.data.gamification.CRITERIA_CHALLENGE
import com.fittrainer.data.gamification.Challenge
import com.fittrainer.data.gamification.GamificationSummary
import java.time.LocalDate

/** Una medalla lista para dibujar. showsBar: bloqueada con barra (las de desafío no tienen). */
data class MedalUi(
    val code: String,
    val name: String,
    val description: String?,
    val category: String?,
    val unlocked: Boolean,
    val dateLabel: String?,
    val progressLabel: String?,
    val progress: Float,
    val showsBar: Boolean,
)

data class ChallengeUi(val id: String, val name: String, val description: String?, val progress: Float, val progressLabel: String, val timeLabel: String)

data class GamificationReady(
    val currentStreak: Int,
    val longestStreak: Int,
    val prSessions: Int,
    val fullWeeks: Int,
    val medals: List<MedalUi>,
    /** Las últimas 3 desbloqueadas (bloque de Progreso). */
    val recent: List<MedalUi>,
    val activeChallenges: List<ChallengeUi>,
    val finishedChallenges: List<ChallengeUi>,
)

sealed interface GamificationContent {
    data object Loading : GamificationContent
    data object NeverSynced : GamificationContent
    data class Ready(val ready: GamificationReady) : GamificationContent
}

data class GamificationUiState(
    val content: GamificationContent = GamificationContent.Loading,
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val notice: String? = null,
)

fun contentOf(summary: GamificationSummary?, today: LocalDate): GamificationContent =
    summary?.let { GamificationContent.Ready(readyState(it, today)) } ?: GamificationContent.NeverSynced

fun readyState(summary: GamificationSummary, today: LocalDate): GamificationReady {
    val (unlocked, locked) = summary.achievements.partition { it.unlocked }
    val medals = unlocked.sortedByDescending { it.achievement.unlockedAt }.map { it.toMedal() } +
        locked.sortedByDescending { it.current.toFloat() / it.achievement.target.coerceAtLeast(1) }.map { it.toMedal() }
    val (active, finished) = summary.challenges.partition { it.status == "active" }
    return GamificationReady(
        summary.currentStreak, summary.longestStreak, summary.prSessions, summary.fullWeeks,
        medals, medals.filter { it.unlocked }.take(3),
        active.map { it.toUi(today) }, finished.map { it.toUi(today) },
    )
}

private fun AchievementView.toMedal(): MedalUi {
    val a = achievement
    val isChallenge = a.criteriaType == CRITERIA_CHALLENGE
    return MedalUi(
        code = a.code,
        name = a.name,
        description = a.description,
        category = a.category,
        unlocked = unlocked,
        dateLabel = a.unlockedAt?.let(::shortDate),
        progressLabel = when {
            unlocked -> null
            awaitingSync -> "Se confirma al sincronizar"
            isChallenge -> "Cumplí un desafío"
            else -> "$current/${a.target}"
        },
        progress = if (unlocked) 1f else current.toFloat() / a.target.coerceAtLeast(1),
        showsBar = !unlocked && !isChallenge,
    )
}

private fun Challenge.toUi(today: LocalDate) = ChallengeUi(
    id = id,
    name = name,
    description = description,
    progress = (progressPct / 100).toFloat().coerceIn(0f, 1f),
    progressLabel = challengeProgressLabel(goalType, currentProgress, goalValue),
    timeLabel = when (status) {
        "active" -> daysLeftLabel(endsAt.atZone(BUSINESS_ZONE).toLocalDate(), today)
        "completed" -> "Cumplido"
        else -> "No se cumplió"
    },
)
