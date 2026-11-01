package com.fittrainer.data.api.notifications

import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/** GET /notifications (contratos-api.md § Notificaciones). `data` siempre es un objeto, `{}` si no hay contexto. */
@Serializable
data class NotificationDto(
    val id: String,
    val type: String,
    val title: String,
    val body: String? = null,
    val data: JsonObject = JsonObject(emptyMap()),
    val read: Boolean,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class NotificationMetaDto(
    @SerialName("unread_count") val unreadCount: Int,
    /** Cursor opaco: se pasa tal cual en el `before` de la próxima página. Null si no hay más. */
    @SerialName("next_before") val nextBefore: String? = null,
)

@Serializable
data class NotificationPageDto(val data: List<NotificationDto>, val meta: NotificationMetaDto)

/** POST /notifications/tokens. `platform` viaja siempre: el Json de la app no codifica defaults y el backend lo exige. */
@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class PushTokenDto(val token: String, @EncodeDefault val platform: String = "android")
