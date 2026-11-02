package com.fittrainer.ui.today

import com.fittrainer.data.routine.TodayContent
import com.fittrainer.data.workout.Workout
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
 * Con una sesión abierta igual tiene que haber cómo volver (spec §3: aunque sea de otra rutina o de otro día).
 * Solo si es de la rutina que Hoy muestra para entrenar lo hace el hero; si es de otra (o de una rutina que ya
 * no existe), el hero queda bloqueado y la vuelta es esta tarjeta.
 */
fun showsActiveWorkoutCard(content: TodayContent?, active: Workout?): Boolean =
    active != null && (content !is TodayContent.Training || active.routineId != content.routine.id)
