package com.fittrainer.data.db.templates.trainer

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
abstract class TrainerTemplatesDao {

    @Query("SELECT * FROM trainer_templates WHERE trainerId = :trainerId ORDER BY name COLLATE NOCASE, id")
    abstract fun observeAll(trainerId: String): Flow<List<TrainerTemplateEntity>>

    @Query("SELECT * FROM trainer_templates_sync WHERE trainerId = :trainerId")
    abstract fun observeSync(trainerId: String): Flow<TrainerTemplatesSyncEntity?>

    @Query("SELECT * FROM trainer_templates WHERE trainerId = :trainerId AND id = :id")
    abstract fun observe(trainerId: String, id: String): Flow<TrainerTemplateEntity?>

    @Query("SELECT * FROM trainer_templates WHERE trainerId = :trainerId")
    abstract suspend fun all(trainerId: String): List<TrainerTemplateEntity>

    @Upsert
    abstract suspend fun upsert(rows: List<TrainerTemplateEntity>)

    @Upsert
    abstract suspend fun upsertSync(sync: TrainerTemplatesSyncEntity)

    @Query("DELETE FROM trainer_templates WHERE trainerId = :trainerId AND id = :id")
    abstract suspend fun forget(trainerId: String, id: String)

    @Query("DELETE FROM trainer_templates WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerRows(trainerId: String)

    @Query("DELETE FROM trainer_templates_sync WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerSync(trainerId: String)

    @Query("DELETE FROM trainer_templates")
    abstract suspend fun clearRows()

    @Query("DELETE FROM trainer_templates_sync")
    abstract suspend fun clearSync()

    /** La lista completa, todo o nada. Las que siguen conservan su detalle (structureJson). */
    @Transaction
    open suspend fun replaceAll(sync: TrainerTemplatesSyncEntity, rows: List<TrainerTemplateEntity>) {
        val details = all(sync.trainerId).associate { it.id to it.structureJson }
        clearOwnerRows(sync.trainerId)
        upsert(rows.map { it.copy(structureJson = it.structureJson ?: details[it.id]) })
        upsertSync(sync)
    }

    @Transaction
    open suspend fun clearOwner(trainerId: String) {
        clearOwnerRows(trainerId)
        clearOwnerSync(trainerId)
    }

    @Transaction
    open suspend fun clear() {
        clearRows()
        clearSync()
    }
}
