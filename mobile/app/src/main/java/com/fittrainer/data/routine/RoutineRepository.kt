package com.fittrainer.data.routine

import com.fittrainer.data.api.RoutineApi
import com.fittrainer.data.db.routine.RoutineDao
import com.fittrainer.data.db.routine.RoutineSyncEntity
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Offline-first: la UI observa Room; refresh() trae de la API y reemplaza el caché entero.
 * El caché tiene dueño: lo guardado para otro alumno se ve como "nunca sincronizó".
 */
@Singleton
class RoutineRepository @Inject constructor(
    private val api: RoutineApi,
    private val dao: RoutineDao,
    private val clock: Clock,
) : UserDataCleaner {

    /**
     * Los flujos de Room solo avisan que algo cambió; cada emisión es una lectura transaccional
     * de dueño + rutinas ([RoutineDao.snapshot]), así nunca se mezclan datos de dos alumnos.
     */
    @OptIn(ExperimentalCoroutinesApi::class)
    fun observeCache(ownerId: String): Flow<RoutineCache> =
        combine(dao.observeSync(), dao.observeRoutines()) { _, _ -> }
            .mapLatest {
                val snapshot = dao.snapshot(ownerId) ?: return@mapLatest RoutineCache(emptyList(), null)
                RoutineCache(snapshot.routines.map { it.toDomain() }, Instant.ofEpochMilli(snapshot.sync.lastSyncedAt))
            }
            .distinctUntilChanged()

    private val refreshMutex = Mutex()

    /** Cuántas sincronizaciones buenas hubo y de quién fue la última (para no repetir un pedido recién hecho). */
    @Volatile private var successCount = 0L
    @Volatile private var successOwner: String? = null

    /**
     * Si falla, Room queda como estaba y el error viaja en un [DataException]. Un pedido a la vez: si mientras
     * esperaba terminó bien otro del mismo alumno (Hoy y Mis rutinas refrescando juntas), usa ese resultado.
     */
    suspend fun refresh(ownerId: String): Result<Unit> {
        val seen = successCount
        return refreshMutex.withLock {
            if (successCount != seen && successOwner == ownerId) return@withLock Result.success(Unit)
            fetch(ownerId).onSuccess {
                successCount++
                successOwner = ownerId
            }
        }
    }

    private suspend fun fetch(ownerId: String): Result<Unit> = try {
        val routines = api.mine().data
        dao.replaceAll(
            RoutineSyncEntity(ownerId = ownerId, lastSyncedAt = clock.millis()),
            routines.map { it.toEntity() },
            routines.flatMap { it.toExerciseEntities() },
        )
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearIfOwner(ownerId)
    }
}
