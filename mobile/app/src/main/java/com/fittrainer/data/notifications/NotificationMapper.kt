package com.fittrainer.data.notifications

import com.fittrainer.data.api.notifications.NotificationDto
import com.fittrainer.data.db.notifications.NotificationEntity
import java.time.Instant
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject

/** Null si el tipo no es de alumno (comment, pr, achievement) o si `created_at` no se puede leer: esa fila no se guarda. */
fun NotificationDto.toEntity(ownerId: String): NotificationEntity? {
    if (NotificationType.fromWire(type) == null) return null
    val created = createdAtMillis() ?: return null
    return NotificationEntity(
        id = id,
        ownerId = ownerId,
        type = type,
        title = title,
        body = body,
        dataJson = data.toString(),
        read = read,
        createdAt = created,
    )
}

/** `created_at` en milisegundos, de cualquier tipo; null si no se puede leer. */
fun NotificationDto.createdAtMillis(): Long? = try {
    // Supabase manda "+00:00" y microsegundos: OffsetDateTime los acepta, igual que "Z".
    OffsetDateTime.parse(createdAt).toInstant().toEpochMilli()
} catch (e: DateTimeParseException) {
    null
}

fun NotificationEntity.toModel(): AppNotification? {
    val kind = NotificationType.fromWire(type) ?: return null
    return AppNotification(id, kind, title, body, dataJson.toTextMap(), read, Instant.ofEpochMilli(createdAt))
}

/** Valores primitivos como texto; arrays y objetos como su JSON. Un JSON roto queda como mapa vacío. */
private fun String.toTextMap(): Map<String, String> = try {
    Json.parseToJsonElement(this).jsonObject.mapValues { it.value.asText() }
} catch (e: IllegalArgumentException) {
    emptyMap()
}

private fun JsonElement.asText(): String = if (this is JsonPrimitive) content else toString()
