package com.fittrainer.data.gamification

import java.time.DayOfWeek.FRIDAY
import java.time.DayOfWeek.MONDAY
import java.time.DayOfWeek.THURSDAY
import java.time.DayOfWeek.WEDNESDAY
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class LocalStreakTest {
    private fun d(day: Int) = LocalDate.of(2026, 10, day)
    private fun snap(current: Int, longest: Int, last: Int?) = Snapshot(current, longest, last?.let(::d), 0, 0, 0, 0L)
    private val all = emptySet<java.time.DayOfWeek>()

    @Test fun sinExtrasYSinCorteDevuelveLaFoto() =
        assertEquals(LocalStreak(3, 5), localStreak(snap(3, 5, 29), emptyList(), all, d(30)))

    @Test fun hoyNoCortaAunqueTodaviaNoSeEntreno() =
        assertEquals(LocalStreak(3, 5), localStreak(snap(3, 5, 29), emptyList(), setOf(FRIDAY), d(30)))

    @Test fun elDiaSiguienteSumaUno() =
        assertEquals(LocalStreak(4, 5), localStreak(snap(3, 5, 29), listOf(d(30)), all, d(30)))

    @Test fun elMismoDiaDeLaFotoNoSuma() =
        assertEquals(LocalStreak(3, 5), localStreak(snap(3, 5, 30), listOf(d(30), d(30)), all, d(30)))

    @Test fun unDiaAsignadoSinEntrenarEnElMedioVuelveAUno() =
        assertEquals(LocalStreak(1, 5), localStreak(snap(3, 5, 26), listOf(d(30)), setOf(MONDAY, WEDNESDAY, FRIDAY), d(30)))

    @Test fun losDiasNoAsignadosNoCortan() =
        assertEquals(LocalStreak(4, 5), localStreak(snap(3, 5, 26), listOf(d(28)), setOf(MONDAY, WEDNESDAY, FRIDAY), d(28)))

    @Test fun entrenarUnDiaNoAsignadoSuma() =
        assertEquals(LocalStreak(4, 5), localStreak(snap(3, 5, 26), listOf(d(27)), setOf(MONDAY), d(27)))

    @Test fun sinRutinaTodosLosDiasSonAsignados() =
        assertEquals(LocalStreak(1, 5), localStreak(snap(3, 5, 26), listOf(d(28)), all, d(28)))

    @Test fun variasExtrasSeguidasSumanYActualizanLaMejor() =
        assertEquals(LocalStreak(6, 6), localStreak(snap(4, 4, 27), listOf(d(29), d(28)), all, d(29)))

    @Test fun sinFotoDeUltimoDiaLaPrimeraExtraDejaUno() =
        assertEquals(LocalStreak(1, 1), localStreak(snap(0, 0, null), listOf(d(30)), all, d(30)))

    @Test fun cortadaSinExtrasLaActualEsCeroYLaMejorNoCambia() =
        assertEquals(LocalStreak(0, 5), localStreak(snap(3, 5, 26), emptyList(), all, d(29)))

    @Test fun lasExtrasPosterioresAHoySeIgnoran() =
        assertEquals(LocalStreak(3, 5), localStreak(snap(3, 5, 29), listOf(d(31)), all, d(30)))

    @Test fun fotaViejaSinRachaYUnaExtraVuelveAUnoConUnDiaAsignadoEnElMedio() =
        assertEquals(LocalStreak(1, 5), localStreak(snap(0, 5, 26), listOf(d(30)), setOf(MONDAY, WEDNESDAY, FRIDAY), d(30)))

    @Test fun elCorteFinalCortaLaRachaDespuesDeUnaExtraAnterior() =
        assertEquals(LocalStreak(0, 5), localStreak(snap(3, 5, 26), listOf(d(27)), setOf(THURSDAY), d(30)))

    @Test fun unDiaAsignadoEnElMedioDeUnHuecoLargoVuelveAUno() =
        assertEquals(LocalStreak(1, 5), localStreak(snap(3, 5, 5), listOf(d(26)), setOf(MONDAY), d(26)))

    @Test fun unHuecoSinDiasAsignadosSumaUnoAunqueSeaLargo() =
        assertEquals(LocalStreak(4, 5), localStreak(snap(3, 5, 19), listOf(d(26)), setOf(MONDAY), d(26)))

    @Test fun elDiaLoDefineBuenosAiresNoElTelefono() {
        // 2026-10-31T02:30Z son las 23:30 del 30 en Buenos Aires.
        assertEquals(d(30), businessDate(java.time.Instant.parse("2026-10-31T02:30:00Z").toEpochMilli()))
    }
}
