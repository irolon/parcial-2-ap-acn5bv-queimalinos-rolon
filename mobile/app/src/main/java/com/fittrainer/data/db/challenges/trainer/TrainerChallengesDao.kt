package com.fittrainer.data.db.challenges.trainer

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
abstract class TrainerChallengesDao {

    @Query("SELECT * FROM trainer_challenges WHERE trainerId = :trainerId ORDER BY position, id")
    abstract fun observeCatalog(trainerId: String): Flow<List<TrainerChallengeEntity>>

    @Query("SELECT * FROM trainer_challenges_sync WHERE trainerId = :trainerId")
    abstract fun observeCatalogSync(trainerId: String): Flow<TrainerChallengesSyncEntity?>

    /** Activas primero; dentro de cada grupo, la más nueva primero. */
    @Query(
        "SELECT * FROM trainer_student_challenges WHERE trainerId = :trainerId AND studentId = :studentId " +
            "ORDER BY (status = 'active') DESC, startedAt DESC, id DESC"
    )
    abstract fun observeStudent(trainerId: String, studentId: String): Flow<List<TrainerStudentChallengeEntity>>

    @Query("SELECT * FROM trainer_student_challenges_sync WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract fun observeStudentSync(trainerId: String, studentId: String): Flow<TrainerStudentChallengesSyncEntity?>

    @Upsert
    abstract suspend fun upsertCatalog(rows: List<TrainerChallengeEntity>)

    @Upsert
    abstract suspend fun upsertCatalogSync(sync: TrainerChallengesSyncEntity)

    @Upsert
    abstract suspend fun upsertAssignments(rows: List<TrainerStudentChallengeEntity>)

    @Upsert
    abstract suspend fun upsertStudentSync(sync: TrainerStudentChallengesSyncEntity)

    @Query("DELETE FROM trainer_challenges WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun forgetChallenge(trainerId: String, id: String)

    @Query("DELETE FROM trainer_challenges WHERE trainerId = :trainerId")
    abstract suspend fun clearCatalogRows(trainerId: String)

    @Query("DELETE FROM trainer_student_challenges WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun clearStudentRows(trainerId: String, studentId: String)

    @Query("DELETE FROM trainer_challenges_sync WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerCatalogSync(trainerId: String)

    @Query("DELETE FROM trainer_student_challenges WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerAssignments(trainerId: String)

    @Query("DELETE FROM trainer_student_challenges_sync WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerStudentSync(trainerId: String)

    @Query("DELETE FROM trainer_challenges")
    abstract suspend fun clearCatalogAll()

    @Query("DELETE FROM trainer_challenges_sync")
    abstract suspend fun clearCatalogSyncAll()

    @Query("DELETE FROM trainer_student_challenges")
    abstract suspend fun clearAssignmentsAll()

    @Query("DELETE FROM trainer_student_challenges_sync")
    abstract suspend fun clearStudentSyncAll()

    /** La lista completa, todo o nada. */
    @Transaction
    open suspend fun replaceCatalog(sync: TrainerChallengesSyncEntity, rows: List<TrainerChallengeEntity>) {
        clearCatalogRows(sync.trainerId)
        upsertCatalog(rows)
        upsertCatalogSync(sync)
    }

    /** Las asignaciones de un alumno, todo o nada. */
    @Transaction
    open suspend fun replaceStudent(sync: TrainerStudentChallengesSyncEntity, rows: List<TrainerStudentChallengeEntity>) {
        clearStudentRows(sync.trainerId, sync.studentId)
        upsertAssignments(rows)
        upsertStudentSync(sync)
    }

    @Transaction
    open suspend fun clearOwner(trainerId: String) {
        clearCatalogRows(trainerId)
        clearOwnerCatalogSync(trainerId)
        clearOwnerAssignments(trainerId)
        clearOwnerStudentSync(trainerId)
    }

    @Transaction
    open suspend fun clear() {
        clearCatalogAll()
        clearCatalogSyncAll()
        clearAssignmentsAll()
        clearStudentSyncAll()
    }
}
