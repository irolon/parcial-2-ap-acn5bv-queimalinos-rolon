package com.fittrainer.data.students.overview

import com.fittrainer.data.api.students.OverviewDto
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.db.students.overview.TrainerOverviewDao
import com.fittrainer.data.db.students.overview.TrainerOverviewEntity
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

/** Inicio del entrenador, offline-first: la UI observa Room y refresh() reemplaza el resumen entero (o nada). */
@Singleton
class TrainerOverviewRepository @Inject constructor(
    private val api: StudentsApi,
    private val dao: TrainerOverviewDao,
    private val clock: Clock,
) : UserDataCleaner {

    fun observe(trainerId: String): Flow<OverviewCache?> = dao.observe(trainerId).map { row ->
        row?.let { r ->
            runCatching { json.decodeFromString<OverviewDto>(r.dataJson).toDomain() }.getOrNull()
                ?.let { OverviewCache(it, Instant.ofEpochMilli(r.fetchedAt)) }
        }
    }.distinctUntilChanged()

    suspend fun refresh(trainerId: String): Result<Unit> = try {
        val data = api.overview().data
        dao.upsert(TrainerOverviewEntity(trainerId, json.encodeToString(data), clock.millis()))
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}
