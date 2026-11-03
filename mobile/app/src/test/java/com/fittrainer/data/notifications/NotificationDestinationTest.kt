package com.fittrainer.data.notifications

import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationDestinationTest {
    @Test fun destinoPorTipo() {
        assertEquals(
            NotificationDestination.SessionDetail("s1"),
            destinationOf("comment", mapOf("session_id" to "s1")),
        )
        assertEquals(
            NotificationDestination.ExerciseChart("e1"),
            destinationOf("pr", mapOf("exercise_ids" to """["e1","e2"]""")),
        )
        assertEquals(NotificationDestination.NotificationsList, destinationOf("achievement", mapOf("x" to "y")))
        assertEquals(NotificationDestination.NotificationsList, destinationOf(null, emptyMap()))
        assertEquals(NotificationDestination.NotificationsList, destinationOf("inactivity", mapOf("session_id" to "s1")))
    }

    @Test fun destinoConDatosRotosVaALaLista() {
        val list = NotificationDestination.NotificationsList
        assertEquals(list, destinationOf("pr", mapOf("exercise_ids" to "no-json")))
        assertEquals(list, destinationOf("pr", mapOf("exercise_ids" to "[]")))
        assertEquals(list, destinationOf("pr", emptyMap()))
        assertEquals(list, destinationOf("pr", mapOf("exercise_ids" to "[1,2]")))
        assertEquals(list, destinationOf("pr", mapOf("exercise_ids" to """{"a":"b"}""")))
        assertEquals(list, destinationOf("pr", mapOf("exercise_ids" to """[""]""")))
        assertEquals(list, destinationOf("comment", emptyMap()))
        assertEquals(list, destinationOf("comment", mapOf("session_id" to "")))
    }
}
