package com.fittrainer.navigation

import com.fittrainer.navigation.trainer.TRAINER_NOTIFICATIONS_ROUTE
import com.fittrainer.ui.notifications.launch.NavTarget
import com.fittrainer.ui.notifications.launch.PendingNav
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

    @Test fun laListaDelEntrenadorCuelgaDeInicioSalvoQueYaEsteAhi() {
        assertEquals(
            listOf(NavStep.Tab(TRAINER_HOME_ROUTE), NavStep.Push(TRAINER_NOTIFICATIONS_ROUTE)),
            navSteps(PendingNav(NavTarget.TrainerNotifications, false), TRAINER_STUDENTS_ROUTE),
        )
        assertEquals(emptyList<NavStep>(), navSteps(PendingNav(NavTarget.TrainerNotifications, false), TRAINER_NOTIFICATIONS_ROUTE))
    }
}
