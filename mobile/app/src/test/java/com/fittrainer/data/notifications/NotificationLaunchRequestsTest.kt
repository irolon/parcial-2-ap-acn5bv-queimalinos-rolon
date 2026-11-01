package com.fittrainer.data.notifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationLaunchRequestsTest {
    @Test fun extrasDePushDeComentario() {
        val extras = mapOf("type" to "comment", "session_id" to "s1", "notification_id" to "n1")
        assertEquals(
            PendingLaunch(NotificationDestination.SessionDetail("s1"), "n1"),
            launchFromExtras(extras),
        )
    }

    @Test fun intentSinTypeNoEsDePush() {
        assertNull(launchFromExtras(emptyMap()))
        assertNull(launchFromExtras(mapOf("session_id" to "s1")))
    }

    @Test fun resumenDeLogrosSinId() {
        assertEquals(
            PendingLaunch(NotificationDestination.NotificationsList, null),
            launchFromExtras(mapOf("type" to "achievement")),
        )
    }

    @Test fun pedirYConsumir() {
        val requests = NotificationLaunchRequests()
        val launch = PendingLaunch(NotificationDestination.NotificationsList, null)
        requests.request(launch)
        assertEquals(launch, requests.pending.value)
        requests.consume()
        assertNull(requests.pending.value)
    }
}
