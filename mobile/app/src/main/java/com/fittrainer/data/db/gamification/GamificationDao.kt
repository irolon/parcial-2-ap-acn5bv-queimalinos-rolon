package com.fittrainer.data.db.gamification

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.gamification.FinishedSession
import kotlinx.coroutines.flow.Flow

/** Caché de gamificación (tarjeta 15). Todo por dueño; se borra en el logout. */
@Dao
abstract class GamificationDao {
    @Query("SELECT * FROM gamification_snapshot WHERE ownerId = :ownerId")
    abstract fun observeSnapshot(ownerId: String): Flow<GamificationSnapshotEntity?>

    @Query("SELECT * FROM gamification_snapshot WHERE ownerId = :ownerId")
    abstract suspend fun snapshot(ownerId: String): GamificationSnapshotEntity?

    @Query("SELECT * FROM achievement_progress WHERE ownerId = :ownerId ORDER BY position")
    abstract fun observeAchievements(ownerId: String): Flow<List<AchievementProgressEntity>>

    @Query("SELECT * FROM achievement_progress WHERE ownerId = :ownerId ORDER BY position")
    abstract suspend fun achievements(ownerId: String): List<AchievementProgressEntity>

    @Query("SELECT * FROM student_challenges WHERE ownerId = :ownerId ORDER BY startedAt DESC, id DESC")
    abstract fun observeChallenges(ownerId: String): Flow<List<StudentChallengeEntity>>

    /**
     * Sesiones terminadas del celular: las que cierran después de la foto son las "extras" (spec §3.3). Se excluyen las
     * rechazadas por el servidor (FINISHED + FAILED por un 400/409): él nunca las tiene y sumarlas sobre-cuenta.
     */
    @Query("SELECT startedAt, finishedAt FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_FINISHED' AND finishedAt IS NOT NULL AND syncState != '$SYNC_FAILED'")
    abstract fun observeFinishedSessions(ownerId: String): Flow<List<FinishedSession>>

    @Query("SELECT startedAt, finishedAt FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_FINISHED' AND finishedAt IS NOT NULL AND syncState != '$SYNC_FAILED'")
    abstract suspend fun finishedSessions(ownerId: String): List<FinishedSession>

    @Query("SELECT * FROM celebrations WHERE ownerId = :ownerId AND state = '$CELEBRATION_PENDING' ORDER BY createdAt, code")
    abstract fun observePending(ownerId: String): Flow<List<CelebrationEntity>>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    abstract suspend fun insertCelebrations(rows: List<CelebrationEntity>)

    @Query("UPDATE celebrations SET state = '$CELEBRATION_SHOWN' WHERE ownerId = :ownerId AND code IN (:codes)")
    abstract suspend fun markShown(ownerId: String, codes: List<String>)

    @Upsert
    abstract suspend fun upsertSnapshot(snapshot: GamificationSnapshotEntity)

    @Insert
    abstract suspend fun insertAchievements(rows: List<AchievementProgressEntity>)

    @Insert
    abstract suspend fun insertChallenges(rows: List<StudentChallengeEntity>)

    @Query("DELETE FROM gamification_snapshot WHERE ownerId = :ownerId")
    abstract suspend fun deleteSnapshot(ownerId: String)

    @Query("DELETE FROM achievement_progress WHERE ownerId = :ownerId")
    abstract suspend fun deleteAchievements(ownerId: String)

    @Query("DELETE FROM student_challenges WHERE ownerId = :ownerId")
    abstract suspend fun deleteChallenges(ownerId: String)

    @Query("DELETE FROM celebrations WHERE ownerId = :ownerId")
    abstract suspend fun deleteCelebrations(ownerId: String)

    @Query("DELETE FROM gamification_snapshot")
    abstract suspend fun deleteAllSnapshots()

    @Query("DELETE FROM achievement_progress")
    abstract suspend fun deleteAllAchievements()

    @Query("DELETE FROM student_challenges")
    abstract suspend fun deleteAllChallenges()

    @Query("DELETE FROM celebrations")
    abstract suspend fun deleteAllCelebrations()

    /** Reemplaza la foto, los logros y los desafíos de la cuenta (las celebraciones no se tocan). */
    @Transaction
    open suspend fun replace(
        snapshot: GamificationSnapshotEntity,
        achievements: List<AchievementProgressEntity>,
        challenges: List<StudentChallengeEntity>,
    ) {
        deleteAchievements(snapshot.ownerId)
        deleteChallenges(snapshot.ownerId)
        upsertSnapshot(snapshot)
        insertAchievements(achievements)
        insertChallenges(challenges)
    }

    @Transaction
    open suspend fun clear(ownerId: String) {
        deleteSnapshot(ownerId)
        deleteAchievements(ownerId)
        deleteChallenges(ownerId)
        deleteCelebrations(ownerId)
    }

    @Transaction
    open suspend fun clearAll() {
        deleteAllSnapshots()
        deleteAllAchievements()
        deleteAllChallenges()
        deleteAllCelebrations()
    }

    @Transaction
    open suspend fun inTransaction(block: suspend () -> Unit) = block()
}
