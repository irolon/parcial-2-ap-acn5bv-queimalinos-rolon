package com.fittrainer.ui.students.progress

import com.fittrainer.data.students.progress.DayMark
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

const val PROGRESS_SECTION = "PROGRESO"
const val PROGRESS_NOT_LOADED = "Conectate para ver el progreso de este mes."
const val PROGRESS_REFRESH_FAILED = "No pudimos actualizar el progreso."
const val LEGEND_TRAINED = "Entrenó"
const val LEGEND_MISSED = "Faltó"
const val LEGEND_REST = "Sin plan"
val WEEKDAY_INITIALS = listOf("L", "M", "M", "J", "V", "S", "D")

private val SPANISH = Locale.forLanguageTag("es-AR")

/** "6/9": sesiones del mes sobre días asignados hasta hoy. */
fun sessionsLabel(sessions: Int, assignedDays: Int): String = "$sessions/$assignedDays"

/** "Asistencia · noviembre" (con el año si no es el actual: "Asistencia · diciembre 2025"). */
fun monthTitle(month: YearMonth, current: YearMonth): String {
    val name = month.month.getDisplayName(TextStyle.FULL_STANDALONE, SPANISH).lowercase(SPANISH)
    return if (month.year == current.year) "Asistencia · $name" else "Asistencia · $name ${month.year}"
}

/**
 * Celdas de la grilla de 7 columnas que empieza el lunes: null para los huecos antes del día 1 y
 * después del último. Los días que el servidor no mandó quedan sin marca (DayMark con status null no existe:
 * se arma con la fecha y se busca su estado).
 */
fun calendarCells(month: YearMonth, marks: List<DayMark>): List<CalendarCell?> {
    val byDate = marks.associateBy { it.date }
    val leading = month.atDay(1).dayOfWeek.value - 1
    val days = (1..month.lengthOfMonth()).map { d ->
        val date = month.atDay(d)
        CalendarCell(d, byDate[date]?.status)
    }
    val cells = List<CalendarCell?>(leading) { null } + days
    val trailing = (7 - cells.size % 7) % 7
    return cells + List(trailing) { null }
}

data class CalendarCell(val day: Int, val status: com.fittrainer.data.students.progress.DayStatus?)
