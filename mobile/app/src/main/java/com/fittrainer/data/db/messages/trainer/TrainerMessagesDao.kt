package com.fittrainer.data.db.messages.trainer

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
abstract class TrainerMessagesDao {

    @Query("SELECT * FROM trainer_conversations WHERE trainerId = :trainerId ORDER BY position, studentId")
    abstract fun observeConversations(trainerId: String): Flow<List<TrainerConversationEntity>>

    @Query("SELECT * FROM trainer_conversations_sync WHERE trainerId = :trainerId")
    abstract fun observeConversationsSync(trainerId: String): Flow<TrainerConversationsSyncEntity?>

    /** El globito de la pestaña: la suma de los no leídos de la lista guardada. */
    @Query("SELECT COALESCE(SUM(unreadCount), 0) FROM trainer_conversations WHERE trainerId = :trainerId")
    abstract fun observeUnreadTotal(trainerId: String): Flow<Int>

    @Query("SELECT * FROM trainer_messages WHERE trainerId = :trainerId AND studentId = :studentId ORDER BY createdAt, id")
    abstract fun observeMessages(trainerId: String, studentId: String): Flow<List<TrainerMessageEntity>>

    @Query("SELECT * FROM trainer_message_threads WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract fun observeThread(trainerId: String, studentId: String): Flow<TrainerMessageThreadEntity?>

    @Query("SELECT * FROM trainer_message_threads WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun getThread(trainerId: String, studentId: String): TrainerMessageThreadEntity?

    @Query("SELECT MAX(createdAt) FROM trainer_messages WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun newestAt(trainerId: String, studentId: String): Long?

    /** El mensaje con foto más nuevo cuya URL se firmó antes de [signedBefore] (null = ninguno por renovar). */
    @Query(
        "SELECT MAX(createdAt) FROM trainer_messages WHERE trainerId = :trainerId AND studentId = :studentId " +
            "AND imageUrl IS NOT NULL AND fetchedAt < :signedBefore"
    )
    abstract suspend fun newestStaleImageAt(trainerId: String, studentId: String, signedBefore: Long): Long?

    @Query("SELECT MIN(createdAt) FROM trainer_messages WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun oldestAt(trainerId: String, studentId: String): Long?

    @Query("SELECT * FROM trainer_conversations WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun getConversation(trainerId: String, studentId: String): TrainerConversationEntity?

    @Upsert
    abstract suspend fun upsertConversations(rows: List<TrainerConversationEntity>)

    @Upsert
    abstract suspend fun upsertConversationsSync(sync: TrainerConversationsSyncEntity)

    @Upsert
    abstract suspend fun upsertMessages(rows: List<TrainerMessageEntity>)

    @Upsert
    abstract suspend fun upsertThread(thread: TrainerMessageThreadEntity)

    @Query("UPDATE trainer_conversations SET unreadCount = 0 WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun markConversationRead(trainerId: String, studentId: String)

    @Query("DELETE FROM trainer_conversations WHERE trainerId = :trainerId")
    abstract suspend fun clearConversationRows(trainerId: String)

    @Query("DELETE FROM trainer_messages WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun clearThreadMessages(trainerId: String, studentId: String)

    @Query("DELETE FROM trainer_message_threads WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun forgetThreadRow(trainerId: String, studentId: String)

    @Query("DELETE FROM trainer_conversations WHERE trainerId = :trainerId AND studentId = :studentId")
    abstract suspend fun forgetConversation(trainerId: String, studentId: String)

    @Query("DELETE FROM trainer_conversations_sync WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerConversationsSync(trainerId: String)

    @Query("DELETE FROM trainer_messages WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerMessages(trainerId: String)

    @Query("DELETE FROM trainer_message_threads WHERE trainerId = :trainerId")
    abstract suspend fun clearOwnerThreads(trainerId: String)

    @Query("DELETE FROM trainer_conversations")
    abstract suspend fun clearConversationsAll()

    @Query("DELETE FROM trainer_conversations_sync")
    abstract suspend fun clearConversationsSyncAll()

    @Query("DELETE FROM trainer_messages")
    abstract suspend fun clearMessagesAll()

    @Query("DELETE FROM trainer_message_threads")
    abstract suspend fun clearThreadsAll()

    /** La lista completa, todo o nada. */
    @Transaction
    open suspend fun replaceConversations(sync: TrainerConversationsSyncEntity, rows: List<TrainerConversationEntity>) {
        clearConversationRows(sync.trainerId)
        upsertConversations(rows)
        upsertConversationsSync(sync)
    }

    /** Un chat desde cero con la página más nueva (primera vez, o hubo un hueco). */
    @Transaction
    open suspend fun replaceThread(thread: TrainerMessageThreadEntity, rows: List<TrainerMessageEntity>) {
        clearThreadMessages(thread.trainerId, thread.studentId)
        upsertMessages(rows)
        upsertThread(thread)
    }

    /** Suma una página al chat que ya estaba (refresco sin hueco o página anterior). */
    @Transaction
    open suspend fun mergeThread(thread: TrainerMessageThreadEntity, rows: List<TrainerMessageEntity>) {
        upsertMessages(rows)
        upsertThread(thread)
    }

    /** La conversación ya no es del entrenador (403): fuera de la lista y sin su chat. */
    @Transaction
    open suspend fun forget(trainerId: String, studentId: String) {
        forgetConversation(trainerId, studentId)
        clearThreadMessages(trainerId, studentId)
        forgetThreadRow(trainerId, studentId)
    }

    @Transaction
    open suspend fun clearOwner(trainerId: String) {
        clearConversationRows(trainerId)
        clearOwnerConversationsSync(trainerId)
        clearOwnerMessages(trainerId)
        clearOwnerThreads(trainerId)
    }

    @Transaction
    open suspend fun clear() {
        clearConversationsAll()
        clearConversationsSyncAll()
        clearMessagesAll()
        clearThreadsAll()
    }
}
