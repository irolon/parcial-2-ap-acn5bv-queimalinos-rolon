package com.fittrainer.data.notifications

import com.fittrainer.data.session.Role
import org.junit.Assert.assertEquals
import org.junit.Test

/** E12: los destinos de los avisos del entrenador. */
class NotificationDestinationTrainerTest {
    private val full = mapOf("student_id" to "st1", "session_id" to "se1")
    private val list = NotificationDestination.NotificationsList

    @Test fun sustitucionAbreLaSesionDelAlumno() {
        assertEquals(NotificationDestination.StudentSession("st1", "se1"), destinationOf("routine_modified", full))
    }

    @Test fun inactividadAbreLaFicha() {
        assertEquals(NotificationDestination.StudentProfile("st1"), destinationOf("inactivity", mapOf("student_id" to "st1")))
    }

    @Test fun recordYLogroDependenDelRol() {
        val pr = full + ("exercise_ids" to """["e1"]""")
        assertEquals(NotificationDestination.StudentSession("st1", "se1"), destinationOf("pr", pr, Role.TRAINER))
        assertEquals(NotificationDestination.ExerciseChart("e1"), destinationOf("pr", pr, Role.STUDENT))
        val logro = mapOf("student_id" to "st1", "achievement_code" to "X")
        assertEquals(NotificationDestination.StudentProfile("st1"), destinationOf("achievement", logro, Role.TRAINER))
        assertEquals(list, destinationOf("achievement", logro, Role.STUDENT))
    }

    @Test fun datosIncompletosAbrenLaLista() {
        assertEquals(list, destinationOf("routine_modified", mapOf("student_id" to "st1")))
        assertEquals(list, destinationOf("routine_modified", mapOf("session_id" to "se1")))
        assertEquals(list, destinationOf("routine_modified", mapOf("student_id" to "", "session_id" to "se1")))
        assertEquals(list, destinationOf("inactivity", emptyMap()))
        assertEquals(list, destinationOf("pr", mapOf("student_id" to "st1"), Role.TRAINER))
        assertEquals(list, destinationOf("achievement", emptyMap(), Role.TRAINER))
    }

    @Test fun elPushDelEntrenadorSeResuelveSinElRol() {
        val launch = launchFromExtras(full + mapOf("type" to "routine_modified", "notification_id" to "n9"))
        assertEquals(PendingLaunch(NotificationDestination.StudentSession("st1", "se1"), "n9"), launch)
    }
}
