package com.fittrainer.ui.notifications

import com.fittrainer.data.notifications.AppNotification
import java.time.Instant
import java.time.ZoneId

enum class NotificationGroup { TODAY, YESTERDAY, EARLIER }

/** Agrupa por día calendario en la zona dada (no por 24 h). Devuelve solo los grupos con avisos, en orden. */
fun group(
    items: List<AppNotification>,
    now: Instant,
    zone: ZoneId,
): List<Pair<NotificationGroup, List<AppNotification>>> {
    val today = now.atZone(zone).toLocalDate()
    val byGroup = items.groupBy { item ->
        val day = item.createdAt.atZone(zone).toLocalDate()
        when {
            !day.isBefore(today) -> NotificationGroup.TODAY
            day == today.minusDays(1) -> NotificationGroup.YESTERDAY
            else -> NotificationGroup.EARLIER
        }
    }
    return NotificationGroup.entries.mapNotNull { g -> byGroup[g]?.let { g to it } }
}
