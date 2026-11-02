package com.fittrainer.data.api.history

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * PATCH /sessions/:id/comment. Sin valor por defecto a propósito: el null viaja explícito y borra
 * el comentario (igual que "" o solo espacios).
 */
@Serializable
data class TrainerCommentRequest(@SerialName("trainer_comment") val trainerComment: String?)

/** La respuesta es el resumen de la sesión, ya con el comentario. */
@Serializable
data class HistorySummaryResponse(val data: HistorySummaryDto)
