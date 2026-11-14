package com.fittrainer.testing.fakes.gamification

import com.fittrainer.data.db.gamification.AchievementProgressEntity
import com.fittrainer.data.db.gamification.CELEBRATION_PENDING
import com.fittrainer.data.db.gamification.CELEBRATION_SHOWN
import com.fittrainer.data.db.gamification.CelebrationEntity
import com.fittrainer.data.db.gamification.GamificationDao
import com.fittrainer.data.db.gamification.GamificationSnapshotEntity
import com.fittrainer.data.db.gamification.StudentChallengeEntity
import com.fittrainer.data.gamification.FinishedSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Room en memoria para la gamificación. `finished`: cierres de sesiones del celular por dueño (la tabla de workout), ya sin las rechazadas (FAILED), como las devuelve el DAO real. */
class FakeGamificationDao : GamificationDao() {
    data class State(
        val snapshots: Map<String, GamificationSnapshotEntity> = emptyMap(),
        val achievements: List<AchievementProgressEntity> = emptyList(),
        val challenges: List<StudentChallengeEntity> = emptyList(),
        val finished: Map<String, List<FinishedSession>> = emptyMap(),
        val celebrations: List<CelebrationEntity> = emptyList(),
    )

    val state = MutableStateFlow(State())

    private fun achievementsOf(s: State, ownerId: String) = s.achievements.filter { it.ownerId == ownerId }.sortedBy { it.position }
    private fun pendingOf(s: State, ownerId: String) =
        s.celebrations.filter { it.ownerId == ownerId && it.state == CELEBRATION_PENDING }.sortedWith(compareBy({ it.createdAt }, { it.code }))

    override fun observeSnapshot(ownerId: String) = state.map { it.snapshots[ownerId] }.distinctUntilChanged()
    override suspend fun snapshot(ownerId: String) = state.value.snapshots[ownerId]
    override fun observeAchievements(ownerId: String) = state.map { achievementsOf(it, ownerId) }.distinctUntilChanged()
    override suspend fun achievements(ownerId: String) = achievementsOf(state.value, ownerId)
    override fun observeChallenges(ownerId: String) = state.map { s ->
        s.challenges.filter { it.ownerId == ownerId }.sortedWith(compareByDescending<StudentChallengeEntity> { it.startedAt }.thenByDescending { it.id })
    }.distinctUntilChanged()
    override fun observeFinishedSessions(ownerId: String) = state.map { it.finished[ownerId].orEmpty() }.distinctUntilChanged()
    override suspend fun finishedSessions(ownerId: String) = state.value.finished[ownerId].orEmpty()
    override fun observePending(ownerId: String) = state.map { pendingOf(it, ownerId) }.distinctUntilChanged()

    override suspend fun insertCelebrations(rows: List<CelebrationEntity>) = state.update { s ->
        val keys = s.celebrations.map { it.ownerId to it.code }.toMutableSet()
        s.copy(celebrations = s.celebrations + rows.filter { keys.add(it.ownerId to it.code) })
    }

    override suspend fun markShown(ownerId: String, codes: List<String>) = state.update { s ->
        s.copy(celebrations = s.celebrations.map { if (it.ownerId == ownerId && it.code in codes) it.copy(state = CELEBRATION_SHOWN) else it })
    }

    override suspend fun upsertSnapshot(snapshot: GamificationSnapshotEntity) =
        state.update { it.copy(snapshots = it.snapshots + (snapshot.ownerId to snapshot)) }
    override suspend fun insertAchievements(rows: List<AchievementProgressEntity>) = state.update { it.copy(achievements = it.achievements + rows) }
    override suspend fun insertChallenges(rows: List<StudentChallengeEntity>) = state.update { it.copy(challenges = it.challenges + rows) }
    override suspend fun deleteSnapshot(ownerId: String) = state.update { it.copy(snapshots = it.snapshots - ownerId) }
    override suspend fun deleteAchievements(ownerId: String) = state.update { s -> s.copy(achievements = s.achievements.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteChallenges(ownerId: String) = state.update { s -> s.copy(challenges = s.challenges.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteCelebrations(ownerId: String) = state.update { s -> s.copy(celebrations = s.celebrations.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteAllSnapshots() = state.update { it.copy(snapshots = emptyMap()) }
    override suspend fun deleteAllAchievements() = state.update { it.copy(achievements = emptyList()) }
    override suspend fun deleteAllChallenges() = state.update { it.copy(challenges = emptyList()) }
    override suspend fun deleteAllCelebrations() = state.update { it.copy(celebrations = emptyList()) }
}
