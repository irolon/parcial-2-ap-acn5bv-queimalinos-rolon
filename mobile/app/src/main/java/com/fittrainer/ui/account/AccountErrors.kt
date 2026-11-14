package com.fittrainer.ui.account

import com.fittrainer.data.account.FieldErrorsException
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException

/** 429 del limitador del backend (`PUT /auth/password` corta la fuerza bruta a la actual). */
private const val TOO_MANY_REQUESTS = 429

/** El aviso general de un guardado que falló sin errores por campo: sin red, demasiados intentos o cualquier otro. */
internal fun saveFailure(e: Throwable): String = when ((e as? DataException)?.error) {
    DataError.Offline -> NEEDS_CONNECTION
    DataError.Http(TOO_MANY_REQUESTS) -> TOO_MANY_ATTEMPTS
    else -> SAVE_FAILED
}

/**
 * Del 400 por campo, el primer mensaje que no va debajo de ningún campo del formulario ([shown], por su nombre de la
 * API): por ejemplo `refresh_token` ("La sesión de este dispositivo no es válida") al cambiar la contraseña.
 */
internal fun FieldErrorsException.unshownMessage(shown: Set<String>): String? =
    fields.filterKeys { it !in shown }.values.firstOrNull()
