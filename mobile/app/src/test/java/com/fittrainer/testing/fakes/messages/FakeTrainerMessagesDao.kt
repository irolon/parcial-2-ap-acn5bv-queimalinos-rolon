package com.fittrainer.testing.fakes.messages

import com.fittrainer.data.db.messages.trainer.TrainerConversationEntity
import com.fittrainer.data.db.messages.trainer.TrainerConversationsSyncEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessageEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessageThreadEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessagesDao
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Room en memoria, con el mismo orden que las queries. */
class FakeTrainerMessagesDao : TrainerMessagesDao() {
    val conversations = MutableStateFlow<List<TrainerConversationEntity>>(emptyList())
    val conversationsSync = MutableStateFlow<Map<String, TrainerConversationsSyncEntity>>(emptyMap())
    val messages = MutableStateFlow<List<TrainerMessageEntity>>(emptyList())
    val threads = MutableStateFlow<Map<Pair<String, String>, TrainerMessageThreadEntity>>(emptyMap())

    private fun TrainerMessageEntity.of(t: String, s: String) = trainerId == t && studentId == s

    override fun observeConversations(trainerId: String): Flow<List<TrainerConversationEntity>> =
        conversations.map { l -> l.filter { it.trainerId == trainerId }.sortedWith(compareBy({ it.position }, { it.studentId })) }
    override fun observeConversationsSync(trainerId: String): Flow<TrainerConversationsSyncEntity?> = conversationsSync.map { it[trainerId] }
    override fun observeUnreadTotal(trainerId: String): Flow<Int> =
        conversations.map { l -> l.filter { it.trainerId == trainerId }.sumOf { it.unreadCount } }
    override fun observeMessages(trainerId: String, studentId: String): Flow<List<TrainerMessageEntity>> =
        messages.map { l -> l.filter { it.of(trainerId, studentId) }.sortedWith(compareBy({ it.createdAt }, { it.id })) }
    override fun observeThread(trainerId: String, studentId: String): Flow<TrainerMessageThreadEntity?> =
        threads.map { it[trainerId to studentId] }

    override suspend fun getThread(trainerId: String, studentId: String) = threads.value[trainerId to studentId]
    override suspend fun newestAt(trainerId: String, studentId: String) =
        messages.value.filter { it.of(trainerId, studentId) }.maxOfOrNull { it.createdAt }
    override suspend fun newestStaleImageAt(trainerId: String, studentId: String, signedBefore: Long) =
        messages.value.filter { it.of(trainerId, studentId) && (it.imageUrl != null || it.body == null) && it.fetchedAt < signedBefore }.maxOfOrNull { it.createdAt }
    override suspend fun getMessages(trainerId: String, ids: List<String>) =
        messages.value.filter { it.trainerId == trainerId && it.id in ids }
    override suspend fun oldestAt(trainerId: String, studentId: String) =
        messages.value.filter { it.of(trainerId, studentId) }.minOfOrNull { it.createdAt }
    override suspend fun getConversation(trainerId: String, studentId: String) =
        conversations.value.firstOrNull { it.trainerId == trainerId && it.studentId == studentId }

    override suspend fun upsertConversations(rows: List<TrainerConversationEntity>) = conversations.update { old ->
        val keys = rows.map { it.trainerId to it.studentId }.toSet()
        old.filter { (it.trainerId to it.studentId) !in keys } + rows
    }
    override suspend fun upsertConversationsSync(sync: TrainerConversationsSyncEntity) =
        conversationsSync.update { it + (sync.trainerId to sync) }
    override suspend fun upsertMessages(rows: List<TrainerMessageEntity>) = messages.update { old ->
        val keys = rows.map { it.trainerId to it.id }.toSet()
        old.filter { (it.trainerId to it.id) !in keys } + rows
    }
    override suspend fun upsertThread(thread: TrainerMessageThreadEntity) =
        threads.update { it + ((thread.trainerId to thread.studentId) to thread) }

    override suspend fun markIncomingRead(ownerId: String, studentId: String, senderRole: String, readAt: Long, upTo: Long) =
        messages.update { l ->
            l.map { if (it.of(ownerId, studentId) && it.senderRole == senderRole && it.readAt == null && it.createdAt <= upTo) it.copy(readAt = readAt) else it }
        }
    override suspend fun markConversationRead(trainerId: String, studentId: String) = conversations.update { l ->
        l.map { if (it.trainerId == trainerId && it.studentId == studentId) it.copy(unreadCount = 0) else it }
    }
    override suspend fun clearConversationRows(trainerId: String) = conversations.update { l -> l.filter { it.trainerId != trainerId } }
    override suspend fun clearThreadMessages(trainerId: String, studentId: String) =
        messages.update { l -> l.filter { !it.of(trainerId, studentId) } }
    override suspend fun forgetThreadRow(trainerId: String, studentId: String) = threads.update { it - (trainerId to studentId) }
    override suspend fun forgetConversation(trainerId: String, studentId: String) =
        conversations.update { l -> l.filter { !(it.trainerId == trainerId && it.studentId == studentId) } }
    override suspend fun clearOwnerConversationsSync(trainerId: String) = conversationsSync.update { it - trainerId }
    override suspend fun clearOwnerMessages(trainerId: String) = messages.update { l -> l.filter { it.trainerId != trainerId } }
    override suspend fun clearOwnerThreads(trainerId: String) = threads.update { m -> m.filterKeys { it.first != trainerId } }
    override suspend fun clearConversationsAll() = conversations.update { emptyList() }
    override suspend fun clearConversationsSyncAll() = conversationsSync.update { emptyMap() }
    override suspend fun clearMessagesAll() = messages.update { emptyList() }
    override suspend fun clearThreadsAll() = threads.update { emptyMap() }
}
