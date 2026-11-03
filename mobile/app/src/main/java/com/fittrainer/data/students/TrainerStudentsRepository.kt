package com.fittrainer.data.students

import com.fittrainer.data.api.students.StudentListItemDto
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.db.students.TrainerStudentsDao
import com.fittrainer.data.db.students.TrainerStudentsSyncEntity
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
 * Lista de alumnos del entrenador, offline-first como LibraryRepository: la UI observa Room y
 * refresh() trae todas las páginas (activos y dados de baja) antes de reemplazar el caché entero.
 */
@Singleton
class TrainerStudentsRepository @Inject constructor(
    private val api: StudentsApi,
    private val dao: TrainerStudentsDao,
    private val clock: Clock,
) : UserDataCleaner {

    /** Cada emisión es una lectura transaccional de dueño + alumnos ([TrainerStudentsDao.snapshot]). */
    @OptIn(ExperimentalCoroutinesApi::class)
    fun observe(trainerId: String): Flow<StudentsCache> =
        combine(dao.observeSync(), dao.observeStudents()) { _, _ -> }
            .mapLatest {
                val snapshot = dao.snapshot(trainerId) ?: return@mapLatest StudentsCache(emptyList(), null)
                StudentsCache(snapshot.students.map { it.toDomain() }, Instant.ofEpochMilli(snapshot.sync.lastSyncedAt))
            }
            .distinctUntilChanged()

    /** Si falla cualquier página, Room queda como estaba y el error viaja en un [DataException]. */
    suspend fun refresh(trainerId: String): Result<Unit> = try {
        val students = allPages(active = true) + allPages(active = false)
        dao.replaceAll(
            TrainerStudentsSyncEntity(trainerId = trainerId, lastSyncedAt = clock.millis()),
            students.distinctBy { it.id }.map { it.toEntity(trainerId) },
        )
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    private suspend fun allPages(active: Boolean): List<StudentListItemDto> {
        val out = mutableListOf<StudentListItemDto>()
        var page = 1
        do {
            val response = api.list(active = active, page = page)
            out += response.data
            page += 1
        } while (page <= response.meta.totalPages && response.data.isNotEmpty())
        return out
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearIfOwner(ownerId)
    }
}
