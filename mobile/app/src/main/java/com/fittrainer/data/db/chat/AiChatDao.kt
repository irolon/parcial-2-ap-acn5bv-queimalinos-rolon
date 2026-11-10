package com.fittrainer.data.db.chat

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

// El backend guarda pregunta y respuesta con el mismo created_at: la pregunta va primero.
private const val ORDER = "ORDER BY createdAt, CASE role WHEN 'user' THEN 0 ELSE 1 END, id"

@Dao
abstract class AiChatDao {

    /** Los mensajes del dueño con createdAt en [from, to). */
    @Query("SELECT * FROM ai_chat_messages WHERE ownerId = :ownerId AND createdAt >= :from AND createdAt < :to $ORDER")
    abstract fun observeBetween(ownerId: String, from: Long, to: Long): Flow<List<AiChatMessageEntity>>

    @Query("SELECT * FROM ai_chat_messages WHERE ownerId = :ownerId AND createdAt >= :from AND createdAt < :to $ORDER")
    abstract suspend fun getBetween(ownerId: String, from: Long, to: Long): List<AiChatMessageEntity>

    @Upsert
    abstract suspend fun insert(rows: List<AiChatMessageEntity>)

    @Query("DELETE FROM ai_chat_messages WHERE ownerId = :ownerId AND createdAt >= :from AND createdAt < :to")
    abstract suspend fun deleteBetween(ownerId: String, from: Long, to: Long)

    /** Reemplaza el rango entero (el refresh del día). */
    @Transaction
    open suspend fun replaceBetween(ownerId: String, from: Long, to: Long, rows: List<AiChatMessageEntity>) {
        deleteBetween(ownerId, from, to)
        insert(rows)
    }

    @Query("DELETE FROM ai_chat_messages WHERE ownerId = :ownerId")
    abstract suspend fun clearOwner(ownerId: String)

    @Query("DELETE FROM ai_chat_messages")
    abstract suspend fun clear()
}
