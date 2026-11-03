package com.fittrainer.ui.routines.trainer.editor

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routines.trainer.RoutineRejectedException
import com.fittrainer.data.templates.trainer.TemplateRejectedException
import com.fittrainer.ui.routines.trainer.ACTION_FAILED
import com.fittrainer.ui.routines.trainer.NEEDS_NETWORK
import com.fittrainer.ui.templates.trainer.SAVE_EXERCISES_UNAVAILABLE

/** El error de "name" va debajo del campo; el resto de la hoja solo tiene el nivel, que es una lista cerrada. */
fun Throwable.saveNameError(): String? = (this as? RoutineRejectedException)?.fields?.get("name")

/**
 * Error de from-routine → aviso de la hoja. Un 400 trae el detalle por campo: se muestra el primero que no
 * es de la hoja (por ejemplo "routine_id": "La rutina tiene que tener entre 1 y 50 ejercicios"), no el
 * "Error de validación" genérico. Un 403 es un ejercicio que ya no se puede usar (assertExercisesAccessible).
 */
fun Throwable.saveMessage(): String? = when {
    this is RoutineRejectedException -> {
        val other = fields.filterKeys { it != "name" }.values.firstOrNull()
        when {
            other != null -> other
            fields.isNotEmpty() -> null // solo el nombre: va debajo del campo
            else -> messageText ?: ACTION_FAILED
        }
    }
    this is TemplateRejectedException -> messageText
    (this as? DataException)?.error == DataError.Http(403) -> SAVE_EXERCISES_UNAVAILABLE
    (this as? DataException)?.error == DataError.Offline -> NEEDS_NETWORK
    else -> ACTION_FAILED
}
