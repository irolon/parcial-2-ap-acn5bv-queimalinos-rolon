package com.fittrainer.testing.fakes.challenges

import com.fittrainer.data.db.challenges.trainer.TrainerChallengeEntity
import com.fittrainer.data.db.challenges.trainer.TrainerChallengesDao
import com.fittrainer.data.db.challenges.trainer.TrainerChallengesSyncEntity
import com.fittrainer.data.db.challenges.trainer.TrainerStudentChallengeEntity
import com.fittrainer.data.db.challenges.trainer.TrainerStudentChallengesSyncEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Room en memoria, con el mismo orden que las queries. */
class FakeTrainerChallengesDao : TrainerChallengesDao() {
    val catalog = MutableStateFlow<List<TrainerChallengeEntity>>(emptyList())
    val catalogSync = MutableStateFlow<Map<String, TrainerChallengesSyncEntity>>(emptyMap())
    val assignments = MutableStateFlow<List<TrainerStudentChallengeEntity>>(emptyList())
    val studentSync = MutableStateFlow<Map<Pair<String, String>, TrainerStudentChallengesSyncEntity>>(emptyMap())

    override fun observeCatalog(trainerId: String): Flow<List<TrainerChallengeEntity>> =
        catalog.map { l -> l.filter { it.trainerId == trainerId }.sortedWith(compareBy({ it.position }, { it.id })) }
    override fun observeCatalogSync(trainerId: String): Flow<TrainerChallengesSyncEntity?> = catalogSync.map { it[trainerId] }
    override fun observeStudent(trainerId: String, studentId: String): Flow<List<TrainerStudentChallengeEntity>> =
        assignments.map { l ->
            l.filter { it.trainerId == trainerId && it.studentId == studentId }
                .sortedWith(compareByDescending<TrainerStudentChallengeEntity> { it.status == "active" }.thenByDescending { it.startedAt }.thenByDescending { it.id })
        }
    override fun observeStudentSync(trainerId: String, studentId: String): Flow<TrainerStudentChallengesSyncEntity?> =
        studentSync.map { it[trainerId to studentId] }

    override suspend fun upsertCatalog(rows: List<TrainerChallengeEntity>) = catalog.update { old ->
        val keys = rows.map { it.trainerId to it.id }.toSet()
        old.filter { (it.trainerId to it.id) !in keys } + rows
    }
    override suspend fun upsertCatalogSync(sync: TrainerChallengesSyncEntity) = catalogSync.update { it + (sync.trainerId to sync) }
    override suspend fun upsertAssignments(rows: List<TrainerStudentChallengeEntity>) = assignments.update { old ->
        val keys = rows.map { it.trainerId to it.id }.toSet()
        old.filter { (it.trainerId to it.id) !in keys } + rows
    }
    override suspend fun upsertStudentSync(sync: TrainerStudentChallengesSyncEntity) =
        studentSync.update { it + ((sync.trainerId to sync.studentId) to sync) }

    override suspend fun forgetChallenge(trainerId: String, id: String) = catalog.update { l -> l.filter { !(it.trainerId == trainerId && it.id == id) } }
    override suspend fun clearCatalogRows(trainerId: String) = catalog.update { l -> l.filter { it.trainerId != trainerId } }
    override suspend fun clearStudentRows(trainerId: String, studentId: String) =
        assignments.update { l -> l.filter { !(it.trainerId == trainerId && it.studentId == studentId) } }
    override suspend fun clearOwnerCatalogSync(trainerId: String) = catalogSync.update { it - trainerId }
    override suspend fun clearOwnerAssignments(trainerId: String) = assignments.update { l -> l.filter { it.trainerId != trainerId } }
    override suspend fun clearOwnerStudentSync(trainerId: String) = studentSync.update { m -> m.filterKeys { it.first != trainerId } }
    override suspend fun clearCatalogAll() = catalog.update { emptyList() }
    override suspend fun clearCatalogSyncAll() = catalogSync.update { emptyMap() }
    override suspend fun clearAssignmentsAll() = assignments.update { emptyList() }
    override suspend fun clearStudentSyncAll() = studentSync.update { emptyMap() }
}
