package com.fittrainer.testing.fakes.chat

import com.fittrainer.data.db.chat.AiChatDao
import com.fittrainer.data.db.chat.AiChatMessageEntity
import com.fittrainer.data.db.chat.ROLE_USER
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Room en memoria para el chat IA (tarjeta 14), con el mismo rango y el mismo orden que las queries. */
class FakeAiChatDao : AiChatDao() {
    val rows = MutableStateFlow<List<AiChatMessageEntity>>(emptyList())

    private fun between(l: List<AiChatMessageEntity>, ownerId: String, from: Long, to: Long) =
        l.filter { it.ownerId == ownerId && it.createdAt >= from && it.createdAt < to }
            .sortedWith(compareBy({ it.createdAt }, { if (it.role == ROLE_USER) 0 else 1 }, { it.id }))

    override fun observeBetween(ownerId: String, from: Long, to: Long): Flow<List<AiChatMessageEntity>> =
        rows.map { between(it, ownerId, from, to) }

    override suspend fun getBetween(ownerId: String, from: Long, to: Long) = between(rows.value, ownerId, from, to)

    override suspend fun insert(rows: List<AiChatMessageEntity>) = this.rows.update { old ->
        val keys = rows.map { it.ownerId to it.id }.toSet()
        old.filter { (it.ownerId to it.id) !in keys } + rows
    }

    override suspend fun deleteBetween(ownerId: String, from: Long, to: Long) =
        rows.update { l -> l.filterNot { it.ownerId == ownerId && it.createdAt >= from && it.createdAt < to } }

    override suspend fun clearOwner(ownerId: String) = rows.update { l -> l.filterNot { it.ownerId == ownerId } }

    override suspend fun clear() = rows.update { emptyList() }
}
