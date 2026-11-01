package com.fittrainer.ui.students.detail

import com.fittrainer.data.students.ARGENTINA
import com.fittrainer.data.students.detail.LatestMetrics
import com.fittrainer.data.students.detail.StudentDetail
import com.fittrainer.ui.join.goalLabel
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

const val DETAIL_TITLE = "Perfil del alumno"
const val DETAIL_NEEDS_NETWORK = "Necesitás conexión para editar, dar de baja o reactivar"
const val DETAIL_GONE = "Este alumno ya no está en tu lista"
const val DETAIL_NOT_LOADED = "Todavía no se bajó esta ficha. Conectate para verla."
const val DETAIL_ACTION_FAILED = "No pudimos guardar el cambio. Probá de nuevo."
const val DISABLE_TEXT = "Va a dejar de poder entrar a la app. Lo que ya tiene abierto sigue andando hasta 1 hora."
const val NO_ROUTINE = "Sin rutina asignada"
const val NO_METRICS = "Sin medidas cargadas"
const val EMPTY_VALUE = "—"

private val DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy")
private val DAY_ABBR = mapOf(
    "monday" to "Lun", "tuesday" to "Mar", "wednesday" to "Mié", "thursday" to "Jue",
    "friday" to "Vie", "saturday" to "Sáb", "sunday" to "Dom",
)
private val DAY_ORDER = DAY_ABBR.keys.toList()

/** Años cumplidos. Un 29/02, en los años no bisiestos, cumple el 01/03 (así cuenta java.time). */
fun ageOn(birth: LocalDate, today: LocalDate): Int = ChronoUnit.YEARS.between(birth, today).toInt()

/** "24 AÑOS · GANAR MASA MUSCULAR · 4 D/SEM", omitiendo lo que falte. */
fun headerLine(detail: StudentDetail, today: LocalDate): String = listOfNotNull(
    detail.birthDate?.let { "${ageOn(it, today)} AÑOS" },
    detail.goal?.let { goalLabel(it).uppercase(Locale.ROOT) },
    detail.activeRoutine?.days?.distinct()?.size?.takeIf { it > 0 }?.let { "$it D/SEM" },
).joinToString(" · ")

/** "Lun · Jue", en orden de la semana. */
fun daysLabel(days: List<String>): String =
    days.distinct().sortedBy { DAY_ORDER.indexOf(it) }.joinToString(" · ") { DAY_ABBR[it] ?: it }

fun dateLabel(date: LocalDate?): String = date?.format(DATE) ?: EMPTY_VALUE

fun dateLabel(instant: Instant): String = instant.atZone(ARGENTINA).toLocalDate().format(DATE)

/** "74,5" con coma decimal y sin ",0". */
fun number(value: Double?): String {
    if (value == null) return EMPTY_VALUE
    val rounded = Math.round(value * 10) / 10.0
    return if (rounded % 1.0 == 0.0) rounded.toLong().toString() else rounded.toString().replace('.', ',')
}

/** Valores de la tarjeta "Última medición", con su unidad. */
fun metricValues(m: LatestMetrics): List<Pair<String, String>> = listOf(
    "PESO" to m.weightKg?.let { "${number(it)} kg" },
    "ALTURA" to m.heightCm?.let { "${number(it)} cm" },
    "IMC" to m.bmi?.let(::number),
    "GRASA" to m.bodyFatPct?.let { "${number(it)} %" },
).map { (k, v) -> k to (v ?: EMPTY_VALUE) }
