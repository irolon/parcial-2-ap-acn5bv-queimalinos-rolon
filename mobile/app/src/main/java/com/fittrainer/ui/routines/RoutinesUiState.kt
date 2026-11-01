package com.fittrainer.ui.routines

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineCache
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.data.routine.resolveToday
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.today.dayInitial
import com.fittrainer.ui.today.dayName
import java.time.LocalDate

const val ROUTINES_REFRESH_FAILED = "No pudimos actualizar. Mostrando tus últimas rutinas"

/** Una rutina en la lista. dayInitials va de lunes a domingo. isToday: es la que muestra la pestaña Hoy. */
data class RoutineCardUi(
    val id: String,
    val name: String,
    val goal: String?,
    val dayInitials: List<String>,
    val dayNames: String,
    val exercisesText: String,
    val isToday: Boolean,
)

sealed interface RoutinesContent {
    data object NeverSynced : RoutinesContent
    data object Empty : RoutinesContent
    data class Routines(val cards: List<RoutineCardUi>) : RoutinesContent
}

/** content == null: todavía no se leyó Room. */
data class RoutinesUiState(
    val content: RoutinesContent? = null,
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val notice: String? = null,
)

/**
 * La marca "Hoy" sale de [resolveToday]: si dos rutinas tienen el día, se marca la que elige Hoy (la más
 * nueva), así las dos pestañas dicen lo mismo.
 */
fun routinesContent(cache: RoutineCache, date: LocalDate): RoutinesContent {
    if (cache.lastSyncedAt == null) return RoutinesContent.NeverSynced
    if (cache.routines.isEmpty()) return RoutinesContent.Empty
    val todayId = (resolveToday(cache.routines, date, everSynced = true) as? TodayContent.Training)?.routine?.id
    return RoutinesContent.Routines(
        cache.routines.sortedByDescending { it.createdAt }.map { it.toCard(isToday = it.id == todayId) },
    )
}

private fun Routine.toCard(isToday: Boolean) = RoutineCardUi(
    id = id,
    name = name,
    goal = goal?.let(::goalLabel),
    dayInitials = days.sorted().map(::dayInitial),
    dayNames = days.sorted().joinToString(", ") { dayName(it) },
    exercisesText = if (exercises.size == 1) "1 ejercicio" else "${exercises.size} ejercicios",
    isToday = isToday,
)
