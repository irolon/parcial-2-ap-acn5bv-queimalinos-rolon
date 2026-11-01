package com.fittrainer.data.notifications.reads

import com.fittrainer.data.api.errorCode
import com.fittrainer.data.api.notifications.NotificationsApi
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.db.notifications.NotificationDao
import retrofit2.HttpException

private const val NOTIFICATION_NOT_FOUND = "NOTIFICATION_NOT_FOUND"

/**
 * Sube las lecturas pendientes del dueño (tarjeta 17). Quien llama tiene el candado de red del repositorio: ningún
 * GET está en vuelo, así que borrar la pendiente apenas el servidor confirma es seguro (no hay respuesta vieja que
 * pueda llegar después y guardarla sin leer). [checkOwner] corta si cambió la cuenta mientras subía.
 */
internal suspend fun uploadReads(api: NotificationsApi, dao: NotificationDao, ownerId: String, checkOwner: suspend () -> Unit) {
    val owner = RequiredUser(ownerId)
    if (dao.meta(ownerId)?.allReadPending == true) {
        val ids = dao.pendingReads(ownerId)
        api.markAllRead(owner)
        dao.inTransaction {
            checkOwner()
            dao.updateMeta(ownerId) { it.copy(allReadPending = false) }
            dao.clearPending(ownerId, ids)
            // Todo lo guardado ya existía en el servidor cuando salió el read-all (los GET corren antes, en serie):
            // allá quedó leído, acá también (incluidas las que bajaron después de tocar "marcar todo").
            dao.setReadExcept(ownerId, emptyList())
        }
    }
    for (id in dao.pendingReads(ownerId)) {
        try {
            api.markRead(owner, id)
        } catch (e: HttpException) {
            // Solo "la notificación ya no existe" descarta la marca; otro 404 (ruta, proxy) la deja pendiente.
            if (e.code() != 404 || e.errorCode() != NOTIFICATION_NOT_FOUND) throw e
        }
        dao.inTransaction {
            checkOwner()
            dao.clearPending(ownerId, listOf(id))
        }
    }
}
