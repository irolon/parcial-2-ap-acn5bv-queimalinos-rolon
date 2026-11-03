package com.fittrainer.data.messages.trainer

import com.fittrainer.data.api.messages.ConversationDto
import com.fittrainer.data.api.messages.MessageDto
import com.fittrainer.data.db.messages.trainer.TrainerConversationEntity
import com.fittrainer.data.db.messages.trainer.TrainerMessageEntity
import java.time.Instant
import java.time.OffsetDateTime

internal fun millis(iso: String): Long = OffsetDateTime.parse(iso).toInstant().toEpochMilli()

internal fun ConversationDto.toEntity(trainerId: String, position: Int) = TrainerConversationEntity(
    trainerId = trainerId,
    studentId = student.id,
    name = student.name,
    avatarUrl = student.avatarUrl,
    lastBody = lastMessage?.body,
    lastHasImage = lastMessage?.hasImage ?: false,
    lastSenderRole = lastMessage?.senderRole,
    lastAt = lastMessage?.createdAt?.let(::millis),
    unreadCount = unreadCount,
    position = position,
)

internal fun MessageDto.toEntity(trainerId: String, fetchedAt: Long) = TrainerMessageEntity(
    trainerId = trainerId,
    id = id,
    studentId = studentId,
    senderRole = senderRole,
    body = body,
    imageUrl = imageUrl,
    broadcastId = broadcastId,
    readAt = readAt?.let(::millis),
    createdAt = millis(createdAt),
    fetchedAt = fetchedAt,
)

internal fun TrainerConversationEntity.toDomain() = Conversation(
    studentId = studentId,
    name = name,
    avatarUrl = avatarUrl,
    last = lastAt?.let { LastMessage(lastBody, lastHasImage, lastSenderRole == SENDER_TRAINER, Instant.ofEpochMilli(it)) },
    unread = unreadCount,
)

internal fun TrainerMessageEntity.toDomain() = Message(
    id = id,
    fromTrainer = senderRole == SENDER_TRAINER,
    body = body,
    imageUrl = imageUrl,
    broadcast = broadcastId != null,
    read = readAt != null,
    at = Instant.ofEpochMilli(createdAt),
)

/** La vista previa de la lista después de que el PT manda [message]. */
internal fun TrainerConversationEntity.withSent(message: TrainerMessageEntity) = copy(
    lastBody = message.body,
    lastHasImage = message.imageUrl != null,
    lastSenderRole = message.senderRole,
    lastAt = message.createdAt,
)
