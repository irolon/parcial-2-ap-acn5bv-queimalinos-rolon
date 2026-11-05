package com.fittrainer.data.agenda.student

import com.fittrainer.data.agenda.AppointmentConflictException
import com.fittrainer.data.api.ErrorBody

private const val SLOT_TAKEN = "SLOT_TAKEN"
private const val SLOT_UNAVAILABLE = "SLOT_UNAVAILABLE"
private const val APPOINTMENT_LIMIT = "APPOINTMENT_LIMIT"
private const val INVALID_TRANSITION = "INVALID_STATUS_TRANSITION"
private const val APPOINTMENT_PAST = "APPOINTMENT_PAST"

// Los mensajes del backend (shared/utils/errors.js), por si el body no se puede leer.
private const val SLOT_TAKEN_FALLBACK = "Ese horario ya está ocupado"
private const val SLOT_UNAVAILABLE_FALLBACK = "Ese horario ya no está disponible"
private const val LIMIT_FALLBACK = "Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme"
private const val CONFLICT_FALLBACK = "No se puede cancelar este turno"

/** Qué pedido falló: cada uno tiene sus errores propios. */
internal sealed interface StudentAgendaOp {
    data object Mine : StudentAgendaOp
    data object Free : StudentAgendaOp

    /** slot: el horario pedido, en millis. */
    data class Request(val slot: Long) : StudentAgendaOp
    data class Cancel(val appointmentId: String) : StudentAgendaOp
}

/**
 * El error propio del pedido para un HTTP [code] con su [body], o null si es uno genérico (DataException). El 403
 * al cancelar no está acá: el repositorio además saca el turno de Room.
 */
internal fun typedFailure(op: StudentAgendaOp, code: Int, body: ErrorBody?): Exception? = when (op) {
    StudentAgendaOp.Mine -> null
    // Sin entrenador el backend da [] (no un error); el 403 es de un alumno dado de baja.
    StudentAgendaOp.Free -> if (code == 403) NoTrainerException() else null
    is StudentAgendaOp.Request -> when {
        code == 409 && body?.code == SLOT_TAKEN -> SlotTakenException(body.message ?: SLOT_TAKEN_FALLBACK)
        code == 400 && body?.code == SLOT_UNAVAILABLE -> SlotUnavailableException(body.message ?: SLOT_UNAVAILABLE_FALLBACK)
        code == 409 && body?.code == APPOINTMENT_LIMIT -> AppointmentLimitException(body.message ?: LIMIT_FALLBACK)
        code == 403 -> NoTrainerException()
        else -> null
    }
    is StudentAgendaOp.Cancel ->
        if (code == 409 && (body?.code == INVALID_TRANSITION || body?.code == APPOINTMENT_PAST)) {
            AppointmentConflictException(body.message ?: CONFLICT_FALLBACK)
        } else {
            null
        }
}
