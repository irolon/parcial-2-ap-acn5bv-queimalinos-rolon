package com.fittrainer.data.db.messages.trainer

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index

/** Una conversación del entrenador con un alumno activo (E11). position: el orden del backend. Fechas en epoch millis. */
@Entity(tableName = "trainer_conversations", primaryKeys = ["trainerId", "studentId"])
data class TrainerConversationEntity(
    val trainerId: String,
    val studentId: String,
    val name: String,
    val avatarUrl: String?,
    val lastBody: String?,
    val lastHasImage: Boolean,
    val lastSenderRole: String?,
    val lastAt: Long?,
    val unreadCount: Int,
    val position: Int,
)

/** Cuándo se bajó la lista de conversaciones (sin fila = nunca). */
@Entity(tableName = "trainer_conversations_sync", primaryKeys = ["trainerId"])
data class TrainerConversationsSyncEntity(
    val trainerId: String,
    val fetchedAt: Long,
)

/**
 * Un mensaje de una conversación. readAt: cuándo lo leyó el otro lado (null = sin leer). fetchedAt: cuándo
 * se bajó la fila, o sea, cuándo se firmó imageUrl (vence a la hora). hasImage (v22, #73): tiene foto aunque
 * imageUrl sea null porque la firma falló; las filas de antes de la v22 quedan en false hasta el próximo refresco.
 */
@Entity(
    tableName = "trainer_messages",
    primaryKeys = ["trainerId", "id"],
    indices = [Index(value = ["trainerId", "studentId", "createdAt"])],
)
data class TrainerMessageEntity(
    val trainerId: String,
    val id: String,
    val studentId: String,
    val senderRole: String,
    val body: String?,
    val imageUrl: String?,
    val broadcastId: String?,
    val readAt: Long?,
    val createdAt: Long,
    val fetchedAt: Long,
    @ColumnInfo(defaultValue = "0") val hasImage: Boolean = false,
)

/** Estado de un chat: el nombre del alumno y el cursor de la página anterior (null = no hay más). Sin fila = nunca se bajó. */
@Entity(tableName = "trainer_message_threads", primaryKeys = ["trainerId", "studentId"])
data class TrainerMessageThreadEntity(
    val trainerId: String,
    val studentId: String,
    val counterpartName: String,
    val nextBefore: String?,
    val fetchedAt: Long,
)
