package com.fittrainer.data.auth.logout

import androidx.datastore.core.DataStore
import kotlinx.coroutines.flow.first

/**
 * Logouts pendientes, en un DataStore cifrado aparte de la sesión (lleva refresh tokens). Un refresh aparece una
 * sola vez (el último push token gana) y se guardan a lo sumo [MAX_PENDING], los más nuevos.
 */
class PendingLogoutStore(private val dataStore: DataStore<PendingLogoutFile>) {

    suspend fun add(item: PendingLogout) {
        dataStore.updateData { file ->
            val others = file.items.filterNot { it.refreshToken == item.refreshToken }
            file.copy(items = (others + item).takeLast(MAX_PENDING))
        }
    }

    suspend fun all(): List<PendingLogout> = dataStore.data.first().items

    /**
     * Saca los que ya llegaron. Lo que se sumó mientras tanto queda. Con [reregister], en la misma escritura deja
     * anotado que hay que volver a registrar el token de push: si el proceso muere justo después, no se pierde.
     */
    suspend fun remove(refreshTokens: Set<String>, reregister: Boolean = false) {
        if (refreshTokens.isEmpty()) return
        dataStore.updateData { file ->
            file.copy(
                items = file.items.filterNot { it.refreshToken in refreshTokens },
                reregisterMarks = if (reregister) file.reregisterMarks + 1 else file.reregisterMarks,
            )
        }
    }

    suspend fun needsReregister(): Boolean = dataStore.data.first().needsReregister

    /** La última marca sin confirmar (null si no hay nada por restaurar): el alta que se pida ahora la cubre. */
    suspend fun reregisterMark(): Long? = dataStore.data.first().let { if (it.needsReregister) it.reregisterMarks else null }

    /** El alta pedida después de ver [mark] funcionó: confirma hasta esa marca, no las que llegaron después. */
    suspend fun confirmReregister(mark: Long) {
        dataStore.updateData { it.copy(reregisterConfirmed = maxOf(it.reregisterConfirmed, mark)) }
    }

    /** Hay algo que la pasada tiene que hacer. */
    suspend fun hasWork(): Boolean = dataStore.data.first().let { it.items.isNotEmpty() || it.needsReregister }

    companion object {
        const val MAX_PENDING = 10
    }
}
