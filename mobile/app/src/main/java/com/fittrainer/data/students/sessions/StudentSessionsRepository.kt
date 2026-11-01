package com.fittrainer.data.students.sessions

import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.api.history.TrainerCommentRequest
import com.fittrainer.data.db.students.sessions.TrainerSessionEntity
import com.fittrainer.data.db.students.sessions.TrainerSessionsDao
import com.fittrainer.data.db.students.sessions.TrainerSessionsSyncEntity
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import com.fittrainer.data.workout.history.HistoryDetail
import com.fittrainer.data.workout.history.HistoryItem
import java.time.Clock
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.HttpException

/** La lista cacheada de un alumno. fetchedAt == null: nunca se bajó. */
data class SessionsCache(val items: List<HistoryItem>, val fetchedAt: Instant?, val hasMore: Boolean)

/**
 * Historial de un alumno visto por su entrenador. Reusa los DTOs y modelos del historial del alumno
 * sin tocar HistoryRepository. Todo pasa por Room (también las páginas de "Ver más"); el comentario
 * es online. Lista, "Ver más", detalle y comentario de un mismo alumno van de a uno (Mutex): un GET
 * que salió antes de un PATCH termina antes de que el PATCH empiece, y nunca pisa lo guardado.
 */
@Singleton
class StudentSessionsRepository @Inject constructor(
    private val api: SessionApi,
    private val dao: TrainerSessionsDao,
    private val clock: Clock,
) : UserDataCleaner {

    private val locks = ConcurrentHashMap<Pair<String, String>, Mutex>()

    fun observeLatest(trainerId: String, studentId: String): Flow<SessionsCache> =
        combine(dao.observeListed(trainerId, studentId), dao.observeSync(trainerId, studentId)) { rows, sync ->
            SessionsCache(rows.map { it.toItem() }, sync?.fetchedAt?.let(Instant::ofEpochMilli), sync?.hasMore ?: false)
        }.distinctUntilChanged()

    fun observeDetail(trainerId: String, sessionId: String): Flow<HistoryDetail?> =
        dao.observeSession(trainerId, sessionId).map { it?.toDetail() }.distinctUntilChanged()

    /** La página 1: la lista vuelve a ser solo esa. Si falla, Room queda como estaba (con las páginas ya traídas). */
    suspend fun refreshLatest(trainerId: String, studentId: String): Result<Unit> = guarded(trainerId, studentId) {
        val page = api.history(studentId, page = 1, limit = PAGE_SIZE)
        dao.replaceLatest(
            TrainerSessionsSyncEntity(trainerId, studentId, clock.millis(), nextPage = 2, hasMore = page.meta.totalPages > 1),
            rows(trainerId, studentId, page.data),
        )
    }

    /** La página siguiente se guarda en Room y se suma a la lista. Sin red, no toca nada. */
    suspend fun loadMore(trainerId: String, studentId: String): Result<Unit> = guarded(trainerId, studentId) {
        val sync = dao.getSync(trainerId, studentId) ?: return@guarded
        val page = api.history(studentId, page = sync.nextPage, limit = PAGE_SIZE)
        dao.appendPage(
            sync.copy(nextPage = sync.nextPage + 1, hasMore = sync.nextPage < page.meta.totalPages),
            rows(trainerId, studentId, page.data),
        )
    }

    suspend fun refreshDetail(trainerId: String, studentId: String, sessionId: String): Result<Unit> =
        guarded(trainerId, studentId, forget = sessionId) {
            val dto = api.historyDetail(studentId, sessionId).data
            dao.upsertSessions(listOf(dto.toTrainerEntity(trainerId, studentId, dao.getSession(trainerId, sessionId))))
        }

    /** "" o solo espacios borran el comentario (manda null). Se guarda la respuesta del PATCH: es el estado actual. */
    suspend fun saveComment(trainerId: String, studentId: String, sessionId: String, text: String): Result<Unit> =
        guarded(trainerId, studentId, forget = sessionId) {
            val summary = api.comment(sessionId, TrainerCommentRequest(text.trim().ifEmpty { null })).data
            val previous = dao.getSession(trainerId, sessionId)
            dao.upsertSessions(
                listOf(summary.toTrainerEntity(trainerId, studentId, listed = previous?.listed ?: false, exercisesJson = previous?.exercisesJson)),
            )
        }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }

    /** Filas de una página, conservando el detalle de las que no cambiaron. */
    private suspend fun rows(trainerId: String, studentId: String, page: List<HistorySummaryDto>): List<TrainerSessionEntity> {
        val previous = dao.getStudentSessions(trainerId, studentId).associateBy { it.id }
        return page.map { dto -> dto.toTrainerEntity(trainerId, studentId, listed = true, exercisesJson = previous[dto.id]?.keepDetailFor(dto)) }
    }

    /**
     * Corre [block] con el Mutex del alumno. 403/404 → NotFound; si [forget] no es null, esa sesión ya no
     * es visible para el entrenador y sale del caché.
     */
    private suspend fun guarded(trainerId: String, studentId: String, forget: String? = null, block: suspend () -> Unit): Result<Unit> =
        locks.getOrPut(trainerId to studentId) { Mutex() }.withLock {
            try {
                block()
                Result.success(Unit)
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                if (e.code() == 403 || e.code() == 404) {
                    forget?.let { dao.deleteSession(trainerId, it) }
                    Result.failure(DataException(DataError.NotFound, e))
                } else {
                    Result.failure(DataException(e.toDataError(), e))
                }
            } catch (e: Exception) {
                Result.failure(DataException(e.toDataError(), e))
            }
        }

    companion object {
        const val PAGE_SIZE = 20
    }
}
