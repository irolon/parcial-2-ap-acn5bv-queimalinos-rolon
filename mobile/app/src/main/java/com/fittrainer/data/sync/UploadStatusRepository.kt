package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.db.workout.WorkoutDao
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/** Estado de la subida para la UI: siempre de Room, nunca de WorkManager (spec §4). */
class UploadStatusRepository @Inject constructor(private val dao: WorkoutDao) {

    fun observeCounts(ownerId: String): Flow<UploadCounts> = dao.observeUploadCounts(ownerId)

    fun observeSession(sessionId: String): Flow<SessionUploadRow?> = dao.observeSessionUpload(sessionId)

    suspend fun pendingCount(ownerId: String): Int = dao.observeUploadCounts(ownerId).first().pending
}
