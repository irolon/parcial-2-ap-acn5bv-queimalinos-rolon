package com.fittrainer.ui.messages.student.chat

import com.fittrainer.data.messages.trainer.MAX_MESSAGE_LENGTH
import com.fittrainer.data.messages.trainer.Message

/**
 * El chat del alumno con su entrenador (tarjeta 18). loaded: Room ya respondió. everSynced: el chat se bajó
 * alguna vez. photo: la foto elegida para mandar (uri en texto), con el texto de la caja como epígrafe.
 * inactive: la cuenta está dada de baja (409 al enviar).
 */
data class StudentChatUiState(
    val loaded: Boolean = false,
    val trainerName: String = "",
    val messages: List<Message> = emptyList(),
    val hasMore: Boolean = false,
    val everSynced: Boolean = false,
    val offline: Boolean = false,
    val sending: Boolean = false,
    val loadingOlder: Boolean = false,
    val photo: String? = null,
    val notice: String? = null,
    val loadError: String? = null,
    val inactive: Boolean = false,
) {
    /** Con foto alcanza sin texto; el texto tiene el mismo tope que el del PT. */
    fun canSend(draft: String): Boolean =
        !offline && !sending && !inactive && (photo != null || draft.isNotBlank()) && draft.length <= MAX_MESSAGE_LENGTH
}

/** Lo que no sale de Room ni de la red: lo que pasa en la pantalla. */
internal data class StudentChatLocal(
    val sending: Boolean = false,
    val loadingOlder: Boolean = false,
    val photo: String? = null,
    val notice: String? = null,
    val loadError: String? = null,
    val inactive: Boolean = false,
)
