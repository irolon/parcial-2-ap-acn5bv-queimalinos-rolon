package com.fittrainer.data.notifications

import com.fittrainer.data.api.notifications.NotificationsApi
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.db.notifications.NotificationDao
import com.fittrainer.data.notifications.paging.applyMore
import com.fittrainer.data.notifications.paging.applyRefresh
import com.fittrainer.data.notifications.reads.uploadReads
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.UserDataCleaner
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Centro de notificaciones del alumno (tarjeta 17). La UI observa Room; refresh() trae la primera página (y todas
 * las no leídas, para la campana) y loadMore() las siguientes. Las lecturas se guardan primero en Room, en su tabla
 * de pendientes, y suben cuando hay red, una por una. La meta (cursor, everLoaded) se escribe junto con las filas.
 *
 * Todo lo que toca la red (refresco con sus dos GET, "Ver más" con su vuelta y subida de lecturas) va en
 * serie detrás de [network]: ninguna respuesta de un GET se aplica después de un PATCH que salió más tarde, ni dos
 * refrescos se pisan. Un segundo refresco espera al primero y vuelve a pedir (simple; la UI ya evita duplicarlos).
 * Las marcas locales (Room) no esperan el candado: la UI se actualiza al toque.
 */
@Singleton
class NotificationsRepository @Inject constructor(
    private val api: NotificationsApi,
    private val dao: NotificationDao,
    /** Provider: la sesión depende de los UserDataCleaner (este repositorio entre ellos) y Hilt no admite el ciclo. */
    private val sessionProvider: Provider<SessionRepository>,
) : UserDataCleaner {

    /** Sube con cada limpieza: un pedido que arrancó antes del logout no escribe aunque el token siga. */
    @Volatile private var clearGeneration = 0

    /** Candado de red: una sola operación contra la API a la vez (ver la doc de la clase). */
    private val network = Mutex()

    fun observe(ownerId: String): Flow<List<AppNotification>> =
        dao.observe(ownerId).map { rows -> rows.mapNotNull { it.toModel() } }

    fun observeUnread(ownerId: String): Flow<Int> = dao.observeUnreadCount(ownerId)

    /** True si alguna vez un refresco terminó bien (distingue "cargando por primera vez" de "sin notificaciones"). */
    fun everLoaded(ownerId: String): Flow<Boolean> = dao.observeMeta(ownerId).map { it?.everLoaded == true }

    /** Hay otra página para bajar (el cursor guardado no es nulo). */
    fun hasMore(ownerId: String): Flow<Boolean> = dao.observeMeta(ownerId).map { it?.nextBefore != null }

    /** Sube las lecturas pendientes y reemplaza la página 1 en Room. Si falla, Room queda como estaba. */
    suspend fun refresh(ownerId: String): Result<Unit> = guard {
        val gen = clearGeneration
        network.withLock {
            // Si no sube (sin red, 5xx) se sigue: las pendientes están a salvo en su tabla y el upsert no las pisa.
            try {
                upload(ownerId, gen)
            } catch (e: CancellationException) {
                throw e
            } catch (e: AccountChangedException) {
                throw e
            } catch (e: Exception) {
                // se reintenta en el próximo refresco
            }
            val page = api.list(PAGE_SIZE)
            // Todas las no leídas (hasta 100): la campana cuenta en Room y puede haber no leídas más allá de la página 1.
            val unread = api.list(UNREAD_LIMIT, unreadOnly = true)
            dao.inTransaction {
                checkOwner(ownerId, gen)
                dao.applyRefresh(ownerId, page, unread)
            }
        }
    }

    /**
     * La página siguiente según el cursor guardado. Si una página no suma ninguna fila nueva (todas de tipos que no
     * son del alumno, o ya guardadas) sigue con la próxima: "Ver más" nunca "no hace nada". Devuelve si hay más.
     */
    suspend fun loadMore(ownerId: String): Result<Boolean> = guard {
        val gen = clearGeneration
        network.withLock {
            // El cursor se lee con el candado: un refresco que corrió antes ya dejó el suyo.
            var before = dao.meta(ownerId)?.nextBefore ?: return@withLock false
            var hasMore: Boolean? = null
            while (hasMore == null) {
                val page = api.list(PAGE_SIZE, before)
                var added = 0
                dao.inTransaction {
                    checkOwner(ownerId, gen)
                    added = dao.applyMore(ownerId, page)
                }
                val next = page.meta.nextBefore
                hasMore = when {
                    next == null -> false
                    added > 0 -> true
                    else -> null.also { before = next }
                }
            }
            hasMore == true
        }
    }

    /**
     * Queda leída en Room al toque (aunque la notificación no esté guardada, como un push tocado con la app cerrada)
     * y eso es lo que devuelve: si la subida falla (sin red, 5xx) la marca queda pendiente y sube después.
     */
    suspend fun markRead(ownerId: String, id: String): Result<Unit> = guard {
        markLocal(ownerId, id)
        tryUpload(ownerId)
    }

    /** Solo la marca en Room (no toca la red). Quien llama sube después con [uploadPendingReads], sin frenar a nadie. */
    suspend fun markReadLocal(ownerId: String, id: String): Result<Unit> = guard { markLocal(ownerId, id) }

    /**
     * "Marcar todo" es todo lo que el alumno vio: cada no leída guardada queda leída en Room y como lectura pendiente,
     * y sube con su `PATCH /:id/read`. Sin `read-all`: ese marca también lo que llegó al servidor después del toque y
     * nunca bajó al celular (un comentario mientras estaba sin red). Misma regla que [markRead].
     */
    suspend fun markAllRead(ownerId: String): Result<Unit> = guard {
        val gen = clearGeneration
        dao.inTransaction {
            checkOwner(ownerId, gen)
            dao.markAllRead(ownerId)
        }
        tryUpload(ownerId)
    }

    suspend fun uploadPendingReads(ownerId: String): Result<Unit> = guard {
        val gen = clearGeneration
        network.withLock { upload(ownerId, gen) }
    }

    private suspend fun markLocal(ownerId: String, id: String) {
        val gen = clearGeneration
        dao.inTransaction {
            checkOwner(ownerId, gen)
            dao.markRead(ownerId, id)
        }
    }

    /** Con el candado: espera a que termine un GET en vuelo antes de mandar el PATCH. */
    private suspend fun tryUpload(ownerId: String) {
        val gen = clearGeneration
        try {
            network.withLock { upload(ownerId, gen) }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // la marca queda pendiente
        }
    }

    /** Solo con [network] tomado (no es reentrante: adentro del candado se llama a esta, no a [tryUpload]). */
    private suspend fun upload(ownerId: String, gen: Int) = uploadReads(api, dao, ownerId) { checkOwner(ownerId, gen) }

    /** Un pedido que volaba durante el logout no puede escribir las filas del dueño anterior después de limpiar. */
    private suspend fun checkOwner(ownerId: String, gen: Int) {
        val current = (sessionProvider.get().session.first() as? Session.Student)?.user?.id
        if (current != ownerId || gen != clearGeneration) throw AccountChangedException()
    }

    /**
     * Antes de borrar intenta subir las lecturas pendientes (el JWT sigue: los cleaners corren antes del logout), con
     * tope corto y sin fallar: sin red o con red lenta se pierden y esos avisos vuelven a verse sin leer.
     */
    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId != null) withTimeoutOrNull(LOGOUT_UPLOAD_TIMEOUT_MS) { uploadPendingReads(ownerId) }
        clearGeneration++
        dao.clearOwner(ownerId)
    }

    private suspend fun <T> guard(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    private companion object {
        const val PAGE_SIZE = 20
        const val UNREAD_LIMIT = 100
        const val LOGOUT_UPLOAD_TIMEOUT_MS = 2_500L
    }
}
