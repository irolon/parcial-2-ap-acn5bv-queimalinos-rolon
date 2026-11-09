package com.fittrainer.data.notifications

import com.fittrainer.data.session.Role
import java.time.LocalDate
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

    // E13 y tarjeta 16: el PT va a su agenda y el alumno a «Mis turnos». Sin scheduled_at, la semana actual.
    @Test fun unTurnoAbreLaAgendaDelEntrenadorYLosTurnosDelAlumno() {
        val data = mapOf("appointment_id" to "a1")
        assertEquals(NotificationDestination.Agenda(), destinationOf("appointment", data, Role.TRAINER))
        assertEquals(NotificationDestination.StudentAppointments, destinationOf("appointment", data, Role.STUDENT))
        assertEquals(NotificationDestination.StudentAppointments, destinationOf("appointment", emptyMap(), Role.STUDENT))
        assertEquals(NotificationDestination.Agenda(), destinationOf("appointment", emptyMap(), Role.TRAINER))
    }

    // #78: scheduled_at abre la semana del turno (lunes de Argentina); una fecha rota cae en la semana actual.
    @Test fun unTurnoConFechaAbreLaAgendaEnSuSemana() {
        val turno = { at: String -> mapOf("appointment_id" to "a1", "scheduled_at" to at) }
        val lunes23 = NotificationDestination.Agenda(LocalDate.parse("2026-11-23"))
        assertEquals(lunes23, destinationOf("appointment", turno("2026-11-27T21:00:00.000Z"), Role.TRAINER))
        // Domingo 29/11 a las 22 h de acá: en UTC ya es lunes 30, pero la semana sigue siendo la del 23.
        assertEquals(lunes23, destinationOf("appointment", turno("2026-11-30T01:00:00.000Z"), Role.TRAINER))
        assertEquals(NotificationDestination.Agenda(), destinationOf("appointment", turno("mañana"), Role.TRAINER))
        assertEquals(NotificationDestination.StudentAppointments, destinationOf("appointment", turno("2026-11-27T21:00:00.000Z"), Role.STUDENT))
    }

    // El push de turno solo le llega al alumno y se resuelve sin rol: a sus turnos.
    @Test fun elPushDeTurnoSinRolAbreLosTurnosDelAlumno() {
        val launch = launchFromExtras(mapOf("type" to "appointment", "appointment_id" to "a1", "notification_id" to "n5"))
        assertEquals(PendingLaunch(NotificationDestination.StudentAppointments, "n5"), launch)
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
