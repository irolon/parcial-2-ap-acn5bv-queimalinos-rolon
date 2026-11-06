package com.fittrainer.data.agenda

import com.fittrainer.data.students.ARGENTINA
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

/** Días de una semana de la agenda: de lunes a domingo, como la web. */
const val DAYS_PER_WEEK = 7

/** El lunes (día de Argentina) de la semana de [at]. Un domingo 22 h de acá ya es lunes en UTC y sigue siendo domingo. */
fun weekStartOf(at: Instant): LocalDate =
    at.atZone(ARGENTINA).toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

/** El lunes [weeks] semanas después (o antes, si es negativo). */
fun shiftWeek(weekStart: LocalDate, weeks: Long): LocalDate = weekStart.plusWeeks(weeks)

/** El domingo de la semana: el `to` inclusivo del GET. */
fun weekEnd(weekStart: LocalDate): LocalDate = weekStart.plusDays(DAYS_PER_WEEK - 1L)

/** Los 7 días de la semana, de lunes a domingo. */
fun weekDays(weekStart: LocalDate): List<LocalDate> = (0 until DAYS_PER_WEEK).map { weekStart.plusDays(it.toLong()) }

/** Límites de la semana en millis: [lunes 00:00, lunes siguiente 00:00) de Argentina. */
data class WeekBounds(val from: Long, val to: Long)

fun weekBounds(weekStart: LocalDate): WeekBounds = WeekBounds(
    weekStart.atStartOfDay(ARGENTINA).toInstant().toEpochMilli(),
    weekStart.plusWeeks(1).atStartOfDay(ARGENTINA).toInstant().toEpochMilli(),
)

/** El lunes de la semana de un instante ISO (`scheduled_at` de un aviso, #78); null si falta o viene roto. */
fun weekStartOfIso(raw: String?): LocalDate? =
    raw?.let { runCatching { weekStartOf(Instant.parse(it)) }.getOrNull() }

/** El lunes de la semana de un día `YYYY-MM-DD` (el argumento de la ruta); null si falta o viene roto. */
fun weekStartOfDay(raw: String?): LocalDate? =
    raw?.let { runCatching { LocalDate.parse(it).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) }.getOrNull() }

/** El día de Argentina en que cae un instante. */
fun localDay(at: Instant): LocalDate = at.atZone(ARGENTINA).toLocalDate()
