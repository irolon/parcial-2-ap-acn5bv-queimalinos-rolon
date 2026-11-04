package com.fittrainer.data.notifications

import com.fittrainer.data.session.Role
import org.junit.Assert.assertEquals
import org.junit.Test

/** Tarjeta 18: el push de mensaje nuevo (#70) lleva a la conversación, con cualquier rol. */
class NotificationDestinationMessageTest {
    @Test fun unMensajeAbreLaConversacionDelAlumno() {
        val data = mapOf("student_id" to "s1")
        assertEquals(NotificationDestination.Conversation("s1"), destinationOf("message", data))
        assertEquals(NotificationDestination.Conversation("s1"), destinationOf("message", data, Role.TRAINER))
    }

    @Test fun sinAlumnoAbreLaLista() {
        assertEquals(NotificationDestination.NotificationsList, destinationOf("message", emptyMap()))
        assertEquals(NotificationDestination.NotificationsList, destinationOf("message", mapOf("student_id" to " ")))
    }

    @Test fun elPushNoTraeAvisoParaMarcar() {
        val launch = launchFromExtras(mapOf("type" to "message", "student_id" to "s1"))
        assertEquals(PendingLaunch(NotificationDestination.Conversation("s1"), null), launch)
    }
}
