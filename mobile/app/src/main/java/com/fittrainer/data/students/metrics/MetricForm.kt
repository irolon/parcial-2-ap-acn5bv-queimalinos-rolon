package com.fittrainer.data.students.metrics

import com.fittrainer.data.api.students.CreateMetricRequest
import java.time.LocalDate

enum class MetricField { WEIGHT, HEIGHT, BODY_FAT, WAIST, HIP, CHEST, DATE }

/**
 * Lo que escribe el entrenador, como texto (el teclado argentino usa coma decimal). date: el día de
 * la medida en hora argentina.
 */
data class MetricForm(
    val weight: String = "",
    val height: String = "",
    val bodyFat: String = "",
    val waist: String = "",
    val hip: String = "",
    val chest: String = "",
    val date: LocalDate,
)

/** "80,5" → 80.5; vacío → null; basura → NaN (se marca como error). */
fun parseNumber(text: String): Double? {
    val t = text.trim().replace(',', '.')
    if (t.isEmpty()) return null
    return t.toDoubleOrNull() ?: Double.NaN
}

private fun MetricForm.numbers(): Map<MetricField, Double?> = mapOf(
    MetricField.WEIGHT to parseNumber(weight),
    MetricField.HEIGHT to parseNumber(height),
    MetricField.BODY_FAT to parseNumber(bodyFat),
    MetricField.WAIST to parseNumber(waist),
    MetricField.HIP to parseNumber(hip),
    MetricField.CHEST to parseNumber(chest),
)

/**
 * Reglas del POST (contratos-api.md, Medidas): números ≥ 0, grasa ≤ 100, al menos una medida, fecha no futura.
 * La clave null del mapa es un error general (ninguna medida cargada).
 */
fun MetricForm.errors(today: LocalDate): Map<MetricField?, String> = buildMap {
    val values = numbers()
    values.forEach { (field, v) ->
        when {
            v == null -> Unit
            v.isNaN() -> put(field, "Número inválido")
            v < 0 -> put(field, "No puede ser negativo")
            field == MetricField.BODY_FAT && v > 100 -> put(field, "Hasta 100 %")
        }
    }
    if (values.values.all { it == null }) put(null, "Cargá al menos una medida")
    if (date.isAfter(today)) put(MetricField.DATE, "No puede ser una fecha futura")
}

/**
 * El request con el id del intento (el mismo en un reintento: no duplica). Hoy va con la hora real;
 * otro día, al mediodía argentino de ese día (a medianoche UTC caería el día anterior en Argentina).
 */
fun MetricForm.toRequest(id: String, today: LocalDate, nowIso: String): CreateMetricRequest {
    val v = numbers()
    return CreateMetricRequest(
        id = id,
        recordedAt = if (date == today) nowIso else "${date}T12:00:00-03:00",
        weightKg = v[MetricField.WEIGHT],
        heightCm = v[MetricField.HEIGHT],
        bodyFatPct = v[MetricField.BODY_FAT],
        waistCm = v[MetricField.WAIST],
        hipCm = v[MetricField.HIP],
        chestCm = v[MetricField.CHEST],
    )
}
