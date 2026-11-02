package com.fittrainer.ui.students.metrics

import com.fittrainer.data.students.metrics.StudentMetric
import com.fittrainer.ui.students.detail.number

const val METRICS_TITLE = "Medidas"
const val METRICS_EMPTY = "Todavía no tiene medidas cargadas."
const val METRICS_NOT_LOADED = "Conectate para ver sus medidas."
const val METRICS_REFRESH_FAILED = "No pudimos actualizar las medidas."
const val METRICS_NEEDS_NETWORK = "Necesitás conexión para cargar o borrar medidas"
const val METRIC_SAVED = "Medida guardada"
const val METRIC_DELETED = "Medida borrada"
const val METRIC_SAVE_FAILED = "No sabemos si se guardó. Reintentá con los mismos datos, o cerrá y revisá el historial."
const val METRIC_REJECTED = "El servidor no aceptó la medida. Revisá los datos."
const val METRIC_DELETE_FAILED = "No pudimos borrar la medida. Probá de nuevo."
const val NEW_METRIC = "+ Nueva medida"

/** "80,5 kg · IMC 24,1 · 18 %", solo con lo que tenga; "Altura 178 cm" si no hay nada de eso. */
fun metricLine(m: StudentMetric): String {
    val parts = listOfNotNull(
        m.weightKg?.let { "${number(it)} kg" },
        m.bmi?.let { "IMC ${number(it)}" },
        m.bodyFatPct?.let { "${number(it)} %" },
    )
    return parts.joinToString(" · ").ifEmpty { m.heightCm?.let { "Altura ${number(it)} cm" }.orEmpty() }
}

/** "Cintura 82 · Cadera 95 · Pecho 100" (en cm), o "" si no tiene ninguna. */
fun circumferencesLine(m: StudentMetric): String = listOfNotNull(
    m.waistCm?.let { "Cintura ${number(it)}" },
    m.hipCm?.let { "Cadera ${number(it)}" },
    m.chestCm?.let { "Pecho ${number(it)}" },
).joinToString(" · ")

fun recordedByLabel(recordedBy: String?): String = if (recordedBy == "trainer") "por vos" else "por el alumno"
