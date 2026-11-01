package com.fittrainer.testing.fakes.notifications

import com.fittrainer.data.notifications.NotificationPermission

/** Permiso de notificaciones que el test prende y apaga. */
class FakeNotificationPermission(var on: Boolean = true) : NotificationPermission {
    override fun enabled(): Boolean = on
}
