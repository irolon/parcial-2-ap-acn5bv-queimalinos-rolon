package com.fittrainer.data.routines.trainer

import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import retrofit2.HttpException
import retrofit2.Response

/** El backend rechazó campos (400): mensaje por campo del backend ("rest_seconds", "exercises[0].sets", …). */
class RoutineRejectedException(val fields: Map<String, String>, val messageText: String?) : Exception(messageText)

/** Un Response<Unit> con error se trata igual que el HttpException de los métodos con body. */
fun Response<Unit>.orThrow() {
    if (!isSuccessful) throw HttpException(this)
}

/**
 * 403/404 → la rutina ya no es del entrenador (o no existe): [onGone] y NotFound. 400 → por campo.
 * 409 (quitar el único ejercicio) y el resto → DataError.Http / Offline / Unknown.
 */
suspend fun Exception.toRoutineFailure(onGone: suspend () -> Unit): Exception = when {
    this is HttpException && code() in setOf(403, 404) -> {
        onGone()
        DataException(DataError.NotFound, this)
    }
    this is HttpException && code() == 400 -> {
        val envelope = errorEnvelope()
        if (envelope == null) {
            DataException(DataError.Http(400), this)
        } else {
            val fields = envelope.details.mapNotNull { d -> d.field?.let { it to d.message.orEmpty() } }.toMap()
            RoutineRejectedException(fields, envelope.message.takeIf { fields.isEmpty() })
        }
    }
    else -> DataException(toDataError(), this)
}
