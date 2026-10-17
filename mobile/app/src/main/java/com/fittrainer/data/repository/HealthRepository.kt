package com.fittrainer.data.repository

import com.fittrainer.data.api.FitTrainerApi
import com.fittrainer.data.db.HealthDao
import com.fittrainer.data.db.HealthSnapshotEntity
import java.time.Clock
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Patrón offline-first: la UI observa Room; refresh() trae de la API y escribe en Room.
 * Si la API falla, el caché queda como estaba.
 */
class HealthRepository @Inject constructor(
    private val api: FitTrainerApi,
    private val dao: HealthDao,
    private val clock: Clock,
) {
    fun observe(): Flow<HealthSnapshot?> = dao.observe().map { entity ->
        entity?.let { HealthSnapshot(it.status, it.version, it.serverTimestamp, it.fetchedAt) }
    }

    suspend fun refresh(): Result<Unit> = try {
        val response = api.health()
        dao.upsert(
            HealthSnapshotEntity(
                status = response.status,
                version = response.version,
                serverTimestamp = response.timestamp,
                fetchedAt = clock.millis(),
            )
        )
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }
}
