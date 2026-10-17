package com.fittrainer.data.auth.tokenstore

import com.fittrainer.data.auth.AuthState

// Una "marca" es un id de sesión cerrada, o `*@<epochMillis>` para "todas las sesiones cerradas hasta
// esa hora". Detalle del protocolo en el KDoc de DataStoreTokenStore.

internal const val ALL_SESSIONS = "*"

internal fun AuthState?.visible(closed: Set<String>): AuthState? =
    this?.takeUnless { state -> closed.any { it.hides(state) } }

private fun String.hides(state: AuthState): Boolean {
    if (this == state.sessionId) return true
    val closedAt = allSessionsClosedAt(this) ?: return false
    return closedAt >= state.createdAt
}

/**
 * Hora de una marca de "todas" (`*@<epochMillis>`), o null si es el id de una sesión. La `*` sin
 * hora (versión anterior), ilegible o con la hora máxima (corrupta) vale 0: oculta las sesiones
 * guardadas sin `createdAt` (leen 0), que son las únicas que pudo cerrar, y ninguna creada después.
 * Al ser siempre menor que `Long.MAX_VALUE`, el `+ 1` de [DataStoreTokenStore.save] no desborda.
 */
internal fun allSessionsClosedAt(mark: String): Long? = when {
    mark == ALL_SESSIONS -> 0L
    mark.startsWith("$ALL_SESSIONS@") ->
        mark.substringAfter('@').toLongOrNull()?.takeIf { it < Long.MAX_VALUE } ?: 0L
    else -> null
}
