package com.fittrainer.data.library

import com.fittrainer.data.api.ExerciseApi
import com.fittrainer.data.db.library.LibraryDao
import com.fittrainer.data.db.library.LibrarySyncEntity
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.mapLatest

/**
 * Offline-first, igual que RoutineRepository: la UI observa Room; refresh() trae de la API y
 * reemplaza el caché entero. Lo guardado para otro alumno se ve como "nunca sincronizó".
 */
@Singleton
class LibraryRepository @Inject constructor(
    private val api: ExerciseApi,
    private val dao: LibraryDao,
    private val clock: Clock,
) : UserDataCleaner {

    /** Cada emisión es una lectura transaccional de dueño + ejercicios ([LibraryDao.snapshot]). */
    @OptIn(ExperimentalCoroutinesApi::class)
    fun observeCache(ownerId: String): Flow<LibraryCache> =
        combine(dao.observeSync(), dao.observeExercises()) { _, _ -> }
            .mapLatest {
                val snapshot = dao.snapshot(ownerId) ?: return@mapLatest LibraryCache(emptyList(), null)
                LibraryCache(snapshot.exercises.map { it.toDomain() }, Instant.ofEpochMilli(snapshot.sync.lastSyncedAt))
            }
            .distinctUntilChanged()

    /** Si falla, Room queda como estaba y el error viaja en un [DataException]. */
    suspend fun refresh(ownerId: String): Result<Unit> = try {
        val exercises = api.library().data
        dao.replaceAll(LibrarySyncEntity(ownerId = ownerId, lastSyncedAt = clock.millis()), exercises.toEntities())
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
