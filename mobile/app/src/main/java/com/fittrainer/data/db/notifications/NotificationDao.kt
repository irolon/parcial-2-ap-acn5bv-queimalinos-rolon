package com.fittrainer.data.db.notifications

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Lista de notificaciones por dueño (tarjeta 17), su meta y las lecturas pendientes de subir. */
@Dao
abstract class NotificationDao {

    @Query("SELECT * FROM notifications WHERE ownerId = :ownerId ORDER BY createdAt DESC, id DESC")
    abstract fun observe(ownerId: String): Flow<List<NotificationEntity>>

    @Query("SELECT COUNT(*) FROM notifications WHERE ownerId = :ownerId AND `read` = 0")
    abstract fun observeUnreadCount(ownerId: String): Flow<Int>

    @Upsert
    abstract suspend fun upsertAll(rows: List<NotificationEntity>)

    /** Borra las del dueño con `createdAt >= :from` que no están en [keep] (ya no existen en el servidor). */
    @Query("DELETE FROM notifications WHERE ownerId = :ownerId AND createdAt >= :from AND id NOT IN (:keep)")
    abstract suspend fun deleteFromExcept(ownerId: String, from: Long, keep: List<String>)

    @Query("UPDATE notifications SET `read` = 1 WHERE ownerId = :ownerId AND id = :id")
    abstract suspend fun setRead(ownerId: String, id: String)

    /** Las no leídas que no están en [keep] pasan a leídas (el servidor ya no las tiene sin leer). */
    @Query("UPDATE notifications SET `read` = 1 WHERE ownerId = :ownerId AND `read` = 0 AND id NOT IN (:keep)")
    abstract suspend fun setReadExcept(ownerId: String, keep: List<String>)

    @Query("SELECT id FROM notifications WHERE ownerId = :ownerId AND `read` = 1 AND id IN (:ids)")
    abstract suspend fun readAmong(ownerId: String, ids: List<String>): List<String>

    /** Cuáles de [ids] ya están guardadas para el dueño (para saber cuántas filas nuevas suma una página). */
    @Query("SELECT id FROM notifications WHERE ownerId = :ownerId AND id IN (:ids)")
    abstract suspend fun existingAmong(ownerId: String, ids: List<String>): List<String>

    /** `createdAt` de la más nueva guardada del dueño; null si no tiene ninguna (para saber si la página 1 deja un hueco). */
    @Query("SELECT MAX(createdAt) FROM notifications WHERE ownerId = :ownerId")
    abstract suspend fun newestCreatedAt(ownerId: String): Long?

    @Query("DELETE FROM notifications WHERE ownerId = :ownerId")
    abstract suspend fun clear(ownerId: String)

    @Query("DELETE FROM notifications")
    abstract suspend fun clearAll()

    // Lecturas pendientes: la única fuente de "esto falta subir". Ningún borrado de filas las toca.

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    abstract suspend fun insertPending(row: NotificationPendingReadEntity)

    /** Cada no leída guardada del dueño queda como lectura pendiente ("marcar todo": suben una por una). */
    @Query(
        "INSERT OR IGNORE INTO notification_pending_reads (ownerId, notificationId) " +
            "SELECT ownerId, id FROM notifications WHERE ownerId = :ownerId AND `read` = 0",
    )
    abstract suspend fun insertPendingForUnread(ownerId: String)

    @Query("SELECT notificationId FROM notification_pending_reads WHERE ownerId = :ownerId")
    abstract suspend fun pendingReads(ownerId: String): List<String>

    @Query("SELECT notificationId FROM notification_pending_reads WHERE ownerId = :ownerId AND notificationId IN (:ids)")
    abstract suspend fun pendingAmong(ownerId: String, ids: List<String>): List<String>

    @Query("DELETE FROM notification_pending_reads WHERE ownerId = :ownerId AND notificationId IN (:ids)")
    abstract suspend fun clearPending(ownerId: String, ids: List<String>)

    @Query("DELETE FROM notification_pending_reads WHERE ownerId = :ownerId")
    abstract suspend fun clearPendingOf(ownerId: String)

    @Query("DELETE FROM notification_pending_reads")
    abstract suspend fun clearAllPending()

    /** La marca queda pendiente aunque la notificación no esté guardada; si está, se ve leída al toque. */
    @Transaction
    open suspend fun markRead(ownerId: String, id: String) {
        insertPending(NotificationPendingReadEntity(ownerId, id))
        setRead(ownerId, id)
    }

    @Transaction
    open suspend fun markAllRead(ownerId: String) {
        insertPendingForUnread(ownerId)
        setReadExcept(ownerId, emptyList())
    }

    /**
     * Upsert que nunca desmarca una lectura: el servidor no vuelve una notificación a no leída, así que lo guardado
     * leído gana (un refresco que salió antes de la marca y llega después no la deshace), y la que tiene una lectura
     * pendiente se guarda leída aunque no estuviera en Room.
     */
    @Transaction
    open suspend fun upsertKeepingRead(ownerId: String, rows: List<NotificationEntity>) {
        if (rows.isEmpty()) return
        val ids = rows.map { it.id }
        val read = pendingAmong(ownerId, ids).toSet() + readAmong(ownerId, ids)
        upsertAll(rows.map { if (it.id in read) it.copy(read = true) else it })
    }

    /**
     * Primera página del servidor: lo guardado dentro de su ventana (desde [from], la más vieja de la página tal como
     * vino, con los tipos que no se guardan) que no está en [rows] se borra; lo anterior (páginas viejas ya paginadas)
     * no se toca. Página vacía ([from] null): se borran las filas del dueño. Las lecturas pendientes no se tocan nunca.
     */
    @Transaction
    open suspend fun replaceFirstPage(ownerId: String, rows: List<NotificationEntity>, from: Long? = rows.minOfOrNull { it.createdAt }) {
        if (from == null) return clear(ownerId)
        deleteFromExcept(ownerId, from, rows.map { it.id })
        upsertKeepingRead(ownerId, rows)
    }

    @Query("SELECT * FROM notifications_meta WHERE ownerId = :ownerId")
    abstract fun observeMeta(ownerId: String): Flow<NotificationMetaEntity?>

    @Query("SELECT * FROM notifications_meta WHERE ownerId = :ownerId")
    abstract suspend fun meta(ownerId: String): NotificationMetaEntity?

    @Upsert
    abstract suspend fun upsertMeta(meta: NotificationMetaEntity)

    @Query("DELETE FROM notifications_meta WHERE ownerId = :ownerId")
    abstract suspend fun clearMeta(ownerId: String)

    @Query("DELETE FROM notifications_meta")
    abstract suspend fun clearAllMeta()

    /** Lee la meta del dueño (o una vacía), la transforma y la guarda. */
    @Transaction
    open suspend fun updateMeta(ownerId: String, transform: (NotificationMetaEntity) -> NotificationMetaEntity) =
        upsertMeta(transform(meta(ownerId) ?: NotificationMetaEntity(ownerId)))

    /** Filas, pendientes y meta del dueño (o de todos si es null) en una sola transacción: un logout no deja la mitad. */
    @Transaction
    open suspend fun clearOwner(ownerId: String?) {
        if (ownerId == null) {
            clearAll()
            clearAllPending()
            clearAllMeta()
        } else {
            clear(ownerId)
            clearPendingOf(ownerId)
            clearMeta(ownerId)
        }
    }

    /** Corre el bloque en una sola transacción de Room. */
    @Transaction
    open suspend fun inTransaction(block: suspend () -> Unit) = block()
}
