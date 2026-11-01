package com.fittrainer.testing.fakes.notifications

import com.fittrainer.data.api.notifications.NotificationDto
import java.io.IOException
import kotlinx.serialization.json.JsonObject

fun notificationDto(id: String, type: String = "comment", read: Boolean = false, at: String = "2026-10-30T06:00:00.123456+00:00") =
    NotificationDto(id, type, "Título $id", null, JsonObject(emptyMap()), read, at)

val offline = IOException("sin red")
