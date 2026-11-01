package com.fittrainer.data.notifications

import com.fittrainer.data.db.workout.history.HistoryDao
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.di.notifications.ApplicationScope
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** Lo que necesita resolver el destino de un aviso tocado. Interfaz para probar el resolver con fakes. */
interface LaunchSources {
    /** Dispara el leído y no espera: la navegación no se frena por un PATCH lento. */
    fun markRead(ownerId: String, id: String)
    suspend fun hasHistorySession(ownerId: String, sessionId: String): Boolean
    suspend fun isOnline(): Boolean
    /** Trae la página 1 del historial a Room. Si falla, Room queda como estaba (no lanza). */
    suspend fun refreshHistory(ownerId: String)
}

class RepositoryLaunchSources @Inject constructor(
    private val notifications: NotificationsRepository,
    private val history: HistoryRepository,
    private val historyDao: HistoryDao,
    private val connectivity: ConnectivityObserver,
    @param:ApplicationScope private val appScope: CoroutineScope,
) : LaunchSources {

    /**
     * En el scope de la app: el leído sobrevive aunque la pantalla se vaya. Con la app cerrada el push no pasa por la
     * app y la fila suele no estar en Room: igual queda la lectura pendiente (en su tabla) y sube ahora o con la
     * próxima red; cuando la fila baje, se guarda leída. Un 404 (aviso de otra cuenta) se descarta.
     */
    override fun markRead(ownerId: String, id: String) {
        appScope.launch { notifications.markRead(ownerId, id) }
    }

    override suspend fun hasHistorySession(ownerId: String, sessionId: String): Boolean = historyDao.hasSession(ownerId, sessionId)

    override suspend fun isOnline(): Boolean = connectivity.isOnline.first()

    override suspend fun refreshHistory(ownerId: String) {
        history.refreshList(ownerId)
    }
}
