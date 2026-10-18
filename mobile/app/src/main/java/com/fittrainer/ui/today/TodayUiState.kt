package com.fittrainer.ui.today

import com.fittrainer.data.routine.TodayContent
import java.time.Instant
import java.time.LocalDate

const val MANUAL_REFRESH_FAILED = "No pudimos actualizar. Mostrando tu última rutina"

/** content == null: todavía no se leyó Room. notice: aviso suave del último pull-to-refresh fallido. */
data class TodayUiState(
    val content: TodayContent? = null,
    val studentName: String = "",
    val today: LocalDate,
    val isOffline: Boolean = false,
    val lastSyncedAt: Instant? = null,
    val isRefreshing: Boolean = false,
    val notice: String? = null,
) {
    /** Hay una rutina (o un día de descanso de una rutina) en pantalla. */
    val showsRoutine: Boolean get() = content is TodayContent.Training || content is TodayContent.Rest
}

/**
 * Con una sesión abierta y Hoy sin rutina para entrenar (descanso, sin rutina, sin datos o cargando) igual
 * tiene que haber cómo volver (spec §3: aunque sea de otra rutina o de otro día). En Training lo hace el hero.
 */
fun showsActiveWorkoutCard(content: TodayContent?, workoutActive: Boolean): Boolean =
    workoutActive && content !is TodayContent.Training
