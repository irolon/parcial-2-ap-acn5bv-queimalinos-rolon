package com.fittrainer.data.auth

import com.fittrainer.data.session.Role
import kotlinx.serialization.Serializable

/**
 * Usuario autenticado, tal como lo devuelve el login (sin datos sensibles). [mustChangePassword]: el alumno entró con
 * una clave temporal del PT y el backend le responde 403 a todo hasta que elija una nueva (GX1). Las sesiones guardadas
 * antes de existir el campo lo leen en false.
 */
@Serializable
data class AuthUser(
    val id: String,
    val name: String,
    val email: String,
    val role: Role,
    val mustChangePassword: Boolean = false,
)

/**
 * Sesión que se guarda cifrada en el dispositivo. [sessionId] identifica cada login (UUID generado
 * en el cliente): permite descartar lo que llega tarde de una sesión que ya no es la actual.
 * [createdAt] es el momento del login (epoch millis): una marca de "todas cerradas" solo oculta
 * sesiones creadas hasta ese momento. Las sesiones guardadas antes de existir el campo leen 0.
 */
@Serializable
data class AuthState(
    val accessToken: String,
    val refreshToken: String,
    val user: AuthUser,
    val sessionId: String,
    val createdAt: Long = 0L,
) {
    // Los tokens nunca van a un log.
    override fun toString(): String = "AuthState(user=$user, sessionId=$sessionId, createdAt=$createdAt)"
}

/** Contenido del archivo cifrado. auth = null significa que no hay sesión. */
@Serializable
data class AuthFile(val auth: AuthState? = null)
