package com.fittrainer.testing.fakes.notifications

import com.fittrainer.data.db.notifications.NotificationDao
import com.fittrainer.data.db.notifications.NotificationEntity
import com.fittrainer.data.db.notifications.NotificationMetaEntity
import com.fittrainer.data.db.notifications.NotificationPendingReadEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Notificaciones en memoria con las mismas consultas que el DAO real. */
class FakeNotificationDao : NotificationDao() {
    val rows = MutableStateFlow<Map<String, NotificationEntity>>(emptyMap())
    val metas = MutableStateFlow<Map<String, NotificationMetaEntity>>(emptyMap())
    val pending = MutableStateFlow<Set<NotificationPendingReadEntity>>(emptySet())

    private fun mine(map: Map<String, NotificationEntity>, owner: String) = map.values.filter { it.ownerId == owner }
    private fun update(owner: String, change: (NotificationEntity) -> NotificationEntity?) = rows.update { r ->
        r.mapNotNull { (k, v) -> (if (v.ownerId == owner) change(v) else v)?.let { k to it } }.toMap()
    }

    override fun observe(ownerId: String): Flow<List<NotificationEntity>> =
        rows.map { mine(it, ownerId).sortedWith(compareByDescending<NotificationEntity> { e -> e.createdAt }.thenByDescending { e -> e.id }) }

    override fun observeUnreadCount(ownerId: String): Flow<Int> = rows.map { r -> mine(r, ownerId).count { !it.read } }
    override suspend fun upsertAll(rows: List<NotificationEntity>) = this.rows.update { it + rows.associateBy { r -> r.id } }

    override suspend fun deleteFromExcept(ownerId: String, from: Long, keep: List<String>) =
        update(ownerId) { if (it.createdAt >= from && it.id !in keep) null else it }

    override suspend fun setRead(ownerId: String, id: String) = update(ownerId) { if (it.id == id) it.copy(read = true) else it }
    override suspend fun setReadExcept(ownerId: String, keep: List<String>) =
        update(ownerId) { if (it.id !in keep) it.copy(read = true) else it }

    override suspend fun readAmong(ownerId: String, ids: List<String>): List<String> =
        mine(rows.value, ownerId).filter { it.read && it.id in ids }.map { it.id }

    override suspend fun existingAmong(ownerId: String, ids: List<String>): List<String> =
        mine(rows.value, ownerId).filter { it.id in ids }.map { it.id }

    override suspend fun count(ownerId: String): Int = mine(rows.value, ownerId).size
    override suspend fun clear(ownerId: String) = update(ownerId) { null }
    override suspend fun clearAll() = rows.update { emptyMap() }

    override suspend fun insertPending(row: NotificationPendingReadEntity) =
        pending.update { p -> if (p.any { it.ownerId == row.ownerId && it.notificationId == row.notificationId }) p else p + row }
    override suspend fun insertPendingForUnread(ownerId: String) =
        mine(rows.value, ownerId).filter { !it.read }.forEach { insertPending(NotificationPendingReadEntity(ownerId, it.id)) }

    /** Lecturas pendientes del dueño. */
    fun pendingOf(ownerId: String = "u1") = pending.value.filter { it.ownerId == ownerId }.map { it.notificationId }

    override suspend fun pendingReads(ownerId: String): List<String> = pendingOf(ownerId)
    override suspend fun pendingAmong(ownerId: String, ids: List<String>): List<String> = pendingOf(ownerId).filter { it in ids }
    override suspend fun clearPending(ownerId: String, ids: List<String>) =
        pending.update { p -> p.filterNot { it.ownerId == ownerId && it.notificationId in ids }.toSet() }

    override suspend fun clearPendingOf(ownerId: String) = pending.update { p -> p.filterNot { it.ownerId == ownerId }.toSet() }
    override suspend fun clearAllPending() = pending.update { emptySet() }

    override fun observeMeta(ownerId: String): Flow<NotificationMetaEntity?> = metas.map { it[ownerId] }
    override suspend fun meta(ownerId: String): NotificationMetaEntity? = metas.value[ownerId]
    override suspend fun upsertMeta(meta: NotificationMetaEntity) = metas.update { it + (meta.ownerId to meta) }
    override suspend fun clearMeta(ownerId: String) = metas.update { it - ownerId }
    override suspend fun clearAllMeta() = metas.update { emptyMap() }
}
