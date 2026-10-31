package com.fittrainer.data.workout.history

import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.FEEDBACK_SYNCED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.db.workout.history.HistoryCommentSeenEntity
import com.fittrainer.data.db.workout.history.HistoryDao
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.UserDataCleaner
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import java.io.IOException
import kotlinx.serialization.SerializationException
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException

/** Las que se guardan con detalle para verlas offline (spec §2). */
const val HISTORY_PAGE_SIZE = 20

/**
 * Historial del alumno (spec §4 de la tarjeta 12). La UI observa Room; refresh() trae las 20 más
 * recientes y su detalle. Las sesiones del celular que el servidor todavía no tiene se suman en observe().
 */
@Singleton
class HistoryRepository @Inject constructor(
    private val api: SessionApi,
    private val dao: HistoryDao,
    private val workoutDao: WorkoutDao,
    /** Provider: la sesión depende de los UserDataCleaner (este repositorio entre ellos) y Hilt no admite el ciclo. */
    private val sessionProvider: Provider<SessionRepository>,
) : UserDataCleaner {

    /** Páginas que dijo tener el servidor en la última página 1 que trajo refresh() ("hay más" si la próxima entra). */
    @Volatile var totalPagesAfterRefresh: Int = 0
        private set

    /** Sube con cada limpieza: un pedido que arrancó antes del logout no escribe aunque el token siga (spec §6). */
    @Volatile private var clearGeneration = 0

    /** Sube cada vez que refresh() reemplaza la página 1 en Room (aunque después falle un detalle). */
    private val _refreshGeneration = MutableStateFlow(0)
    val refreshGeneration: StateFlow<Int> = _refreshGeneration

    /** Lista del historial: primero lo del celular que el servidor todavía no tiene, después el caché. */
    fun observe(ownerId: String): Flow<List<HistoryItem>> =
        combine(dao.observeSessions(ownerId), workoutDao.observeForHistory(ownerId), dao.observeSeen(ownerId)) { cached, local, seen ->
            val seenById = seen.associate { it.sessionId to it.comment }
            val cachedIds = cached.map { it.id }.toSet()
            val newestCached = cached.maxOfOrNull { it.startedAt } ?: 0L
            val feedback = local.filter { it.session.feedbackState.hasFeedbackToShow() }.associate { it.session.id to it.session.rpe }
            val onlyLocal = local.filter {
                it.session.id !in cachedIds && (it.session.syncState != SYNC_SYNCED || it.session.startedAt > newestCached)
            }
            onlyLocal.map { it.toHistoryItem() } + cached.map { it.toHistoryItem(feedback[it.id], seenById[it.id]) }
        }

    /** Sesiones con comentario del entrenador que el alumno todavía no abrió (badge de Progreso). */
    fun observeUnreadComments(ownerId: String): Flow<Int> = dao.observeUnreadCount(ownerId)

    /** El alumno abrió ese comentario (ese texto). Sin red: solo Room. */
    suspend fun markCommentSeen(ownerId: String, sessionId: String, comment: String) =
        dao.markSeen(HistoryCommentSeenEntity(sessionId, ownerId, comment))

    /** Detalle: del caché si lo tiene; si no, de la sesión del celular. */
    fun observeDetail(ownerId: String, id: String): Flow<HistoryDetail?> =
        combine(dao.observeDetail(ownerId, id), workoutDao.observeForHistory(ownerId)) { cached, local ->
            val mine = local.firstOrNull { it.session.id == id }
            val own = mine?.session?.takeIf { it.feedbackState.hasFeedbackToShow() }
            cached?.toHistoryDetail(own?.rpe, own?.notes) ?: mine?.toHistoryDetail()
        }

    /** Si la lista falla, Room queda como estaba. Si falla un detalle, lo ya guardado queda y sigue en el próximo. */
    suspend fun refresh(ownerId: String): Result<Unit> = guard { loadDetails(ownerId, loadList(ownerId)) }

    /** Fase 1: la página 1 a Room. Devuelve qué sesiones necesitan su detalle (para refreshDetails). */
    suspend fun refreshList(ownerId: String): Result<PendingDetails> = guard { loadList(ownerId) }

    /** Fase 2: los detalles de la fase 1, de a uno. Corta si no hay red; sigue si un detalle falla por HTTP. */
    suspend fun refreshDetails(ownerId: String, pending: PendingDetails): Result<Unit> = guard { loadDetails(ownerId, pending) }

    private suspend fun loadList(ownerId: String): PendingDetails {
        val gen = clearGeneration
        val page = api.history(ownerId, 1, HISTORY_PAGE_SIZE)
        totalPagesAfterRefresh = page.meta.totalPages
        val cached = dao.sessions(ownerId).associateBy { it.id }
        val stale = page.data.filterNot { cached[it.id]?.detailMatches(it) == true }.map { it.id }.toSet()
        checkOwner(ownerId, gen)
        // El aviso va en la misma transacción que el reemplazo: un "Ver más" no puede colarse entre los dos.
        dao.inTransaction {
            val latest = page.data.map { it.toEntity(ownerId, inLatest = true, detailLoaded = it.id !in stale) }
            dao.replaceLatest(ownerId, latest, complete = page.meta.totalPages <= 1)
            _refreshGeneration.update { it + 1 }
        }
        return PendingDetails(page.data.map { it.id }.filter { it in stale }, gen)
    }

    private suspend fun loadDetails(ownerId: String, pending: PendingDetails) {
        var failure: Exception? = null
        for (id in pending.ids) {
            try {
                saveDetail(ownerId, id, pending.gen)
            } catch (e: CancellationException) {
                throw e
            } catch (e: IOException) {
                throw e // sin red (o cuenta cambiada): seguir sería esperar timeouts de balde
            } catch (e: SerializationException) {
                throw e
            } catch (e: Exception) {
                failure = failure ?: e // HTTP (o lo que sea) en un detalle: se sigue con los demás
            }
        }
        failure?.let { throw it }
    }

    /**
     * "Ver más" desde [startPage], sin detalle. Si una página no suma ninguna sesión nueva, sigue con la siguiente
     * (el toque nunca "no hace nada"). Stale, sin escribir, si un refresh reemplazó la página 1 mientras bajaba.
     */
    suspend fun loadMore(ownerId: String, startPage: Int): Result<LoadMoreResult> = guard {
        val gen = clearGeneration
        val refreshGen = _refreshGeneration.value
        var page = startPage
        var outcome: LoadMoreResult? = null
        while (outcome == null) {
            val result = api.history(ownerId, page, HISTORY_PAGE_SIZE)
            // Chequeos + escritura en una transacción: si un refresh está reemplazando la página 1, esperamos y vemos su aviso.
            var added: Int? = null
            dao.inTransaction {
                checkOwner(ownerId, gen)
                if (_refreshGeneration.value == refreshGen) added = savePage(ownerId, result.data)
            }
            val hasMore = page < result.meta.totalPages
            val n = added
            outcome = when {
                n == null -> LoadMoreResult.Stale
                n > 0 || !hasMore -> LoadMoreResult.Page(hasMore, nextPage = page + 1)
                else -> null.also { page++ }
            }
        }
        outcome
    }

    /**
     * Una página de "Ver más" a Room; devuelve cuántas nuevas sumó. No toca las de las 20 (inLatest, son del refresco);
     * actualiza las demás que ya estaban (comentario, etc.) y conserva su detalle si el resumen no cambió.
     */
    private suspend fun savePage(ownerId: String, data: List<HistorySummaryDto>): Int {
        val cached = dao.sessions(ownerId).associateBy { it.id }
        val (known, fresh) = data.filterNot { cached[it.id]?.inLatest == true }.partition { it.id in cached }
        dao.insertIfAbsent(fresh.map { it.toEntity(ownerId, inLatest = false, detailLoaded = false) })
        if (known.isNotEmpty()) dao.upsertSessions(known.map { it.toEntity(ownerId, inLatest = false, detailLoaded = cached.getValue(it.id).detailMatches(it)) })
        return fresh.size
    }

    /** Detalle de una sesión que no lo tiene guardado (las de "Ver más"). */
    suspend fun loadDetail(ownerId: String, sessionId: String): Result<Unit> = guard { saveDetail(ownerId, sessionId, clearGeneration) }

    private suspend fun saveDetail(ownerId: String, sessionId: String, gen: Int) {
        val detail = api.historyDetail(ownerId, sessionId).data
        checkOwner(ownerId, gen)
        // false: la sesión ya no está en el caché (la borró un refresco); no hay a qué colgarle el detalle.
        dao.replaceDetail(sessionId, detail.exerciseEntities(), detail.setEntities())
    }

    /** Un pedido que volaba durante el logout no puede escribir las filas del dueño anterior después de limpiar. */
    private suspend fun checkOwner(ownerId: String, gen: Int) {
        val current = (sessionProvider.get().session.first() as? Session.Student)?.user?.id
        if (current != ownerId || gen != clearGeneration) throw AccountChangedException()
    }

    override suspend fun clearUserData(ownerId: String?) {
        clearGeneration++
        if (ownerId == null) dao.clearAll() else dao.clear(ownerId)
    }

    private suspend fun <T> guard(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }
}

/** El feedback del celular le gana al caché mientras no se mandó y también después, hasta que un refresco lo traiga. */
private fun String.hasFeedbackToShow() = this == FEEDBACK_PENDING || this == FEEDBACK_SYNCED
