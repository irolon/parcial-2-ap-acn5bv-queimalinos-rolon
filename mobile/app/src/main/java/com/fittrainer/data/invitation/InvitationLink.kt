package com.fittrainer.data.invitation

/**
 * Saca el token de una invitación de lo que llegue: el QR, el link pegado a mano o el deep link.
 * Acepta cualquier URL con el parámetro `token` o el UUID solo. El backend genera el token con
 * crypto.randomUUID(): cualquier otra cosa no es una invitación y no vale la pena llamar a la API.
 */
object InvitationLink {
    private val UUID_REGEX =
        Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", RegexOption.IGNORE_CASE)
    private val TOKEN_PARAM = Regex("[?&]token=([^&#]+)")

    fun parse(raw: String): String? {
        val text = raw.trim()
        val candidate = if (UUID_REGEX.matches(text)) text else TOKEN_PARAM.find(text)?.groupValues?.get(1)
        return candidate?.takeIf { UUID_REGEX.matches(it) }?.lowercase()
    }
}
