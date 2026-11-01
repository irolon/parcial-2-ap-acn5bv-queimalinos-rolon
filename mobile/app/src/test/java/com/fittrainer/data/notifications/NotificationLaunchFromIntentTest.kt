package com.fittrainer.data.notifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationLaunchFromIntentTest {
    private val extras = mapOf("type" to "comment", "session_id" to "s1", "notification_id" to "n1")

    @Test fun relanzadoDesdeRecientesNoRepiteElPush() {
        assertNull(launchFromIntent(launchedFromHistory = true, extras = extras))
    }

    @Test fun tapNormalDevuelveElDestino() {
        assertEquals(
            PendingLaunch(NotificationDestination.SessionDetail("s1"), "n1"),
            launchFromIntent(launchedFromHistory = false, extras = extras),
        )
    }
}
