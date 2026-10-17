package com.fittrainer.ui.join

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException

/** Qué se le dice al alumno y qué puede hacer: reintentar (falla pasajera) o ir al login. */
data class InvitationMessage(val text: String, val canRetry: Boolean, val offerLogin: Boolean)

fun invitationMessage(error: Throwable?): InvitationMessage = when ((error as? DataException)?.error) {
    DataError.InvitationNotFound ->
        InvitationMessage("Esta invitación no existe. Pedile a tu entrenador que te mande una nueva.", false, false)
    DataError.InvitationExpired ->
        InvitationMessage("Esta invitación venció, pedile una nueva a tu profe", false, false)
    DataError.InvitationUsed ->
        InvitationMessage("Esta invitación ya fue usada. Si ya creaste tu cuenta, iniciá sesión.", false, true)
    DataError.StudentEmailExists ->
        InvitationMessage("Ya hay una cuenta con ese email. Iniciá sesión.", false, true)
    DataError.Offline -> InvitationMessage("Sin conexión con el servidor", true, false)
    else -> InvitationMessage("No se pudo completar el alta", true, false)
}

/** Etiquetas de los objetivos del backend (models/invitations GOALS). */
fun goalLabel(goal: String): String = when (goal) {
    "tonify" -> "Tonificar"
    "weight_loss" -> "Bajar de peso"
    "hypertrophy" -> "Ganar masa muscular"
    "strength" -> "Ganar fuerza"
    else -> goal
}
