package com.fittrainer.ui.progress.charts

import com.fittrainer.data.progress.BodyField
import com.fittrainer.data.progress.ChartMetric
import com.fittrainer.data.progress.ChartRange
import java.time.LocalDate
import java.util.Locale

/** Textos y formatos de Progreso → Gráficos. Siempre en es-AR, sin depender del idioma del celular. */
object ChartsTexts {
    private val es = Locale.forLanguageTag("es-AR")
    private const val MINUS = '−'
    private val months = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")

    fun formatNumber(value: Double): String {
        val rounded = Math.round(value * 10) / 10.0
        return if (rounded % 1.0 == 0.0) rounded.toLong().toString() else String.format(es, "%.1f", rounded)
    }

    fun formatKg(value: Double): String = "${formatNumber(value)} kg"

    fun formatValue(value: Double, unit: String): String = if (unit.isEmpty()) formatNumber(value) else "${formatNumber(value)} $unit"

    fun formatDelta(value: Double, unit: String): String {
        val magnitude = formatNumber(kotlin.math.abs(value))
        val sign = when {
            magnitude == "0" -> ""
            value > 0 -> "+"
            else -> MINUS.toString()
        }
        return if (unit.isEmpty()) "$sign$magnitude" else "$sign$magnitude $unit"
    }

    /** Suba que se ve en el texto: el color sale del valor redondeado ("0 kg" nunca va en verde). */
    fun isRise(value: Double): Boolean = value > 0 && formatNumber(value) != "0"

    fun metricLabel(metric: ChartMetric): String = when (metric) {
        ChartMetric.E1RM -> "1RM est."
        ChartMetric.MAX_KG -> "Kg máx"
        ChartMetric.REPS -> "Reps totales"
    }

    fun metricUnit(metric: ChartMetric): String = if (metric == ChartMetric.REPS) "reps" else "kg"

    fun rangeLabel(range: ChartRange): String = when (range) {
        ChartRange.M1 -> "1M"
        ChartRange.M3 -> "3M"
        ChartRange.M6 -> "6M"
        ChartRange.ALL -> "Todo"
    }

    fun fieldLabel(field: BodyField): String = when (field) {
        BodyField.WEIGHT -> "Peso"
        BodyField.BODY_FAT -> "% grasa"
        BodyField.HIP -> "Cadera"
        BodyField.CHEST -> "Pecho"
        BodyField.BMI -> "IMC"
    }

    fun fieldUnit(field: BodyField): String = when (field) {
        BodyField.WEIGHT -> "kg"
        BodyField.BODY_FAT -> "%"
        BodyField.HIP, BodyField.CHEST -> "cm"
        BodyField.BMI -> ""
    }

    fun formatShortDate(date: LocalDate): String = "${date.dayOfMonth} ${months[date.monthValue - 1]}"

    /** Detalle de "En el período": desde qué fecha se mide la diferencia (el primer punto del período). */
    fun formatSince(date: LocalDate): String = "desde ${formatShortDate(date)}"

    const val NO_EXERCISES = "Terminá tu primera sesión para ver tus gráficos"
    const val ONE_POINT = "Entrená otra vez este ejercicio para ver tu curva"
    const val EMPTY_PERIOD = "No entrenaste este ejercicio en este período"
    const val SEE_ALL = "Ver todo"
    const val NO_BODY = "Tu entrenador todavía no cargó medidas"
    const val NO_DATA = "Todavía no hay datos de este ejercicio"
    const val EMPTY_BODY_PERIOD = "No hay medidas en este período"
    const val OFFLINE = "Sin conexión · mostrando lo guardado"
    const val NEVER_LOADED = "Conectate una vez para ver este gráfico"
    const val REFRESH_FAILED = "No pudimos actualizar"
    const val LOAD_FAILED = "No pudimos cargar este gráfico"
    const val RETRY = "Reintentar"
}
