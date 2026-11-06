package com.fittrainer.navigation

import com.fittrainer.navigation.trainer.AGENDA_SHOW_WEEK_KEY
import com.fittrainer.navigation.trainer.TRAINER_AGENDA_ROUTE
import com.fittrainer.navigation.trainer.TRAINER_NOTIFICATIONS_ROUTE
import com.fittrainer.ui.notifications.launch.NavTarget
import com.fittrainer.ui.notifications.launch.PendingNav
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

/** E12: los pasos para llegar a un aviso del entrenador. */
class NotificationNavStepsTrainerTest {
    private val students = NavStep.Tab(TRAINER_STUDENTS_ROUTE)
    private val profile = NavStep.Push(trainerStudentDetailRoute("st1"))
    private val session = NavStep.Push(trainerStudentSessionRoute("st1", "se1"))

    @Test fun pushDeSustitucionPasaPorAlumnosYLaFichaAntesDeLaSesion() {
        val steps = navSteps(PendingNav(NavTarget.TrainerSession("st1", "se1"), fromList = false), TRAINER_HOME_ROUTE)
        // Atrás desde la sesión vuelve a la ficha, y de ahí a Alumnos.
        assertEquals(listOf(students, profile, session), steps)
    }

    @Test fun desdeLaListaLaSesionSeApilaSobreLaLista() {
        val steps = navSteps(PendingNav(NavTarget.TrainerSession("st1", "se1"), fromList = true), TRAINER_NOTIFICATIONS_ROUTE)
        assertEquals(listOf(session), steps)
    }

    @Test fun inactividadAbreLaFicha() {
        assertEquals(listOf(students, profile), navSteps(PendingNav(NavTarget.TrainerStudent("st1"), false), TRAINER_HOME_ROUTE))
        assertEquals(listOf(profile), navSteps(PendingNav(NavTarget.TrainerStudent("st1"), true), TRAINER_NOTIFICATIONS_ROUTE))
    }

    // E13: un aviso de turno lleva a la agenda (Más → Agenda desde un push; apilada sobre la lista desde la lista).
    @Test fun unTurnoAbreLaAgendaSalvoQueYaEsteAbierta() {
        val agenda = NavStep.Push("trainer/agenda")
        val now = NavTarget.TrainerAgenda()
        assertEquals(listOf(NavStep.Tab(TRAINER_MORE_ROUTE), agenda), navSteps(PendingNav(now, false), TRAINER_HOME_ROUTE))
        assertEquals(listOf(agenda), navSteps(PendingNav(now, true), TRAINER_NOTIFICATIONS_ROUTE))
        assertEquals(emptyList<NavStep>(), navSteps(PendingNav(now, false), TRAINER_AGENDA_ROUTE))
    }

    // #78: con la fecha del turno, abre en su semana; ya abierta, le pasa la semana sin recrearla.
    @Test fun unTurnoConFechaAbreLaAgendaEnSuSemana() {
        val target = NavTarget.TrainerAgenda(LocalDate.parse("2026-11-23"))
        val agenda = NavStep.Push("trainer/agenda?week=2026-11-23")
        assertEquals(listOf(NavStep.Tab(TRAINER_MORE_ROUTE), agenda), navSteps(PendingNav(target, false), TRAINER_HOME_ROUTE))
        assertEquals(listOf(agenda), navSteps(PendingNav(target, true), TRAINER_NOTIFICATIONS_ROUTE))
        assertEquals(
            listOf(NavStep.Deliver(AGENDA_SHOW_WEEK_KEY, "2026-11-23")),
            navSteps(PendingNav(target, true), TRAINER_AGENDA_ROUTE),
        )
    }

    @Test fun laListaDelEntrenadorCuelgaDeInicioSalvoQueYaEsteAhi() {
        assertEquals(
            listOf(NavStep.Tab(TRAINER_HOME_ROUTE), NavStep.Push(TRAINER_NOTIFICATIONS_ROUTE)),
            navSteps(PendingNav(NavTarget.TrainerNotifications, false), TRAINER_STUDENTS_ROUTE),
        )
        assertEquals(emptyList<NavStep>(), navSteps(PendingNav(NavTarget.TrainerNotifications, false), TRAINER_NOTIFICATIONS_ROUTE))
    }
}
