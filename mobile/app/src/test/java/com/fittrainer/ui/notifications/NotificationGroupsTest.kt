package com.fittrainer.ui.notifications

import com.fittrainer.data.notifications.AppNotification
import com.fittrainer.data.notifications.NotificationType
import java.time.Instant
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationGroupsTest {
    private val zone = ZoneId.of("America/Argentina/Buenos_Aires")
    private val now = Instant.parse("2026-10-31T15:00:00Z")

    private fun item(id: String, at: String) =
        AppNotification(id, NotificationType.PR, "t", null, emptyMap(), false, Instant.parse(at))

    @Test fun bordeDeMedianocheEnArgentina() {
        // 02:59Z es 23:59 del 30/10 en Buenos Aires: ayer, aunque en UTC ya sea 31/10.
        val groups = group(listOf(item("a", "2026-10-31T02:59:00Z")), now, zone)
        assertEquals(listOf(NotificationGroup.YESTERDAY), groups.map { it.first })
    }

    @Test fun justoDespuesDeMedianocheEsHoy() {
        val groups = group(listOf(item("a", "2026-10-31T03:00:00Z")), now, zone)
        assertEquals(listOf(NotificationGroup.TODAY), groups.map { it.first })
    }

    @Test fun agrupaEnOrdenYConservaElOrdenInterno() {
        val items = listOf(
            item("h1", "2026-10-31T14:00:00Z"),
            item("h2", "2026-10-31T10:00:00Z"),
            item("y", "2026-10-30T15:00:00Z"),
            item("e", "2026-10-25T15:00:00Z"),
        )
        val groups = group(items, now, zone)
        assertEquals(listOf(NotificationGroup.TODAY, NotificationGroup.YESTERDAY, NotificationGroup.EARLIER), groups.map { it.first })
        assertEquals(listOf("h1", "h2"), groups[0].second.map { it.id })
    }

    @Test fun gruposVaciosNoAparecen() {
        assertEquals(emptyList<Any>(), group(emptyList(), now, zone))
        val groups = group(listOf(item("e", "2026-10-01T15:00:00Z")), now, zone)
        assertEquals(listOf(NotificationGroup.EARLIER), groups.map { it.first })
    }
}
