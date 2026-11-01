package com.fittrainer.navigation

import org.junit.Assert.assertEquals
import org.junit.Test

class TabNavigationTest {

    private val trainer = TrainerTabs.map { it.route }
    private val home = TRAINER_HOME_ROUTE
    private val students = TRAINER_STUDENTS_ROUTE
    private val ficha = TRAINER_STUDENT_DETAIL_ROUTE

    @Test fun fichaAbiertaDesdeInicioDejaMarcadoInicioYTocarloVuelve() {
        val stack = listOf(null, home, ficha)
        assertEquals(home, selectedTab(trainer, stack))
        assertEquals(TabAction.PopTo(home), tabAction(home, trainer, stack))
    }

    @Test fun desdeEsaFichaAlumnosAbreSuPestana() {
        assertEquals(TabAction.Navigate(students, restoreState = true), tabAction(students, trainer, listOf(null, home, ficha)))
    }

    @Test fun fichaAbiertaDesdeAlumnos() {
        val stack = listOf(null, home, students, ficha)
        assertEquals(students, selectedTab(trainer, stack))
        assertEquals(TabAction.PopTo(students), tabAction(students, trainer, stack))
        // Volver a Inicio no restaura nada encima de Inicio.
        assertEquals(TabAction.Navigate(home, restoreState = false), tabAction(home, trainer, stack))
    }

    @Test fun enLaRaizNoHaceNada() {
        assertEquals(TabAction.None, tabAction(home, trainer, listOf(null, home)))
        assertEquals(TabAction.None, tabAction(students, trainer, listOf(null, home, students)))
    }

    @Test fun sinPestanaEnElBackStackUsaLaMadreDeLaRuta() {
        assertEquals(STUDENT_PROGRESS_ROUTE, selectedTab(StudentTabs.map { it.route }, listOf(historyDetailRoute("a"))))
    }
}
