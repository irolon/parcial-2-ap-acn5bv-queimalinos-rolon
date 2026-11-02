package com.fittrainer.ui.students.metrics

import com.fittrainer.data.api.students.CreateMetricRequest
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.students.metrics.MetricField
import com.fittrainer.data.students.metrics.MetricForm

/**
 * sheet == null: la hoja "Nueva medida" está cerrada. pending: el request que ya salió una vez y falló sin
 * respuesta (pudo haberse guardado). Mientras exista, el formulario queda bloqueado y "Guardar" reenvía
 * ese mismo request, con el mismo id: el id va atado a un contenido que no cambia.
 */
data class MetricSheet(
    val form: MetricForm,
    val attemptId: String,
    val pending: CreateMetricRequest? = null,
    val errors: Map<MetricField?, String> = emptyMap(),
    val saving: Boolean = false,
    val notice: String? = null,
)

/**
 * Un error incierto (sin red o 5xx) deja el intento pendiente. Un 4xx solo prueba que ESTE envío no se
 * guardó: si ya había un intento incierto antes, el primero pudo haberse guardado y el pendiente sigue.
 */
internal fun stillPending(sheet: MetricSheet, request: CreateMetricRequest, error: Throwable): CreateMetricRequest? =
    sheet.pending ?: request.takeIf { error.isUncertain() }

internal fun failNotice(sheet: MetricSheet, error: Throwable): String =
    if (sheet.pending != null || error.isUncertain()) METRIC_SAVE_FAILED else METRIC_REJECTED

internal fun Throwable.isUncertain(): Boolean = when (val e = (this as? DataException)?.error) {
    is DataError.Http -> e.code >= 500
    else -> true
}
