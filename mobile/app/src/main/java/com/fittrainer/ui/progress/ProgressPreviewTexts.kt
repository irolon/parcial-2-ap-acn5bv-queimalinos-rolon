package com.fittrainer.ui.progress

import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.ui.workout.history.historyDate
import java.time.ZoneId

/** Cuántas sesiones entran en la curva de la tarjeta de Gráficos. */
const val TREND_SESSIONS = 8

/** La sesión más reciente de todo lo guardado (no depende del filtro del historial). */
fun lastSession(items: List<HistoryItem>): HistoryItem? = items.maxByOrNull { it.startedAt }

/** "Lun 9 nov · Piernas"; sin rutina, "Sin rutina" como en la lista. */
fun lastSessionTitle(item: HistoryItem, zone: ZoneId): String = "${historyDate(item.startedAt, zone)} · ${item.routineName ?: "Sin rutina"}"

/** Volumen de las últimas [TREND_SESSIONS] sesiones, de la más vieja a la más nueva. Con menos de 2 no hay curva. */
fun volumeTrend(items: List<HistoryItem>): List<Double> =
    items.sortedBy { it.startedAt }.takeLast(TREND_SESSIONS).map { it.volumeKg }.takeIf { it.size >= 2 } ?: emptyList()

fun chartsCardSubtitle(trend: List<Double>): String =
    if (trend.isEmpty()) "Tus cargas por ejercicio y tus medidas" else "Volumen de tus últimas ${trend.size} sesiones"
