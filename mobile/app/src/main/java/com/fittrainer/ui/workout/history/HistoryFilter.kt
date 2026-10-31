package com.fittrainer.ui.workout.history

import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters

/** Chips de Progreso. WEEK es el de por defecto. */
enum class HistoryFilter(val label: String) {
    WEEK("Esta semana"),
    ALL("Todos"),
    COMMENTED("Comentados 💬"),
    RECORDS("Récords 🏆"),
    PENDING("Sin subir"),
}

/** [lunes 00:00, lunes siguiente 00:00) de la semana de [now], en la zona del celular. */
fun weekBounds(now: Instant, zone: ZoneId): Pair<Instant, Instant> {
    val monday = now.atZone(zone).toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    return monday.atStartOfDay(zone).toInstant() to monday.plusWeeks(1).atStartOfDay(zone).toInstant()
}

/** Función pura sobre lo que ya está en memoria (anda sin red). weekEnd es exclusivo. */
fun filterHistory(items: List<HistoryItem>, filter: HistoryFilter, weekStart: Instant, weekEnd: Instant): List<HistoryItem> = when (filter) {
    HistoryFilter.ALL -> items
    HistoryFilter.WEEK -> items.filter { it.startedAt >= weekStart && it.startedAt < weekEnd }
    HistoryFilter.RECORDS -> items.filter { it.hasPr }
    HistoryFilter.PENDING -> items.filter { it.origin == HistoryOrigin.LOCAL_PENDING }
    HistoryFilter.COMMENTED -> items.filter { it.hasComment }
        .sortedWith(compareByDescending<HistoryItem> { it.commentUnread }.thenByDescending { it.startedAt })
}
