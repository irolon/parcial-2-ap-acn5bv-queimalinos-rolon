package com.fittrainer.ui.account

import com.fittrainer.data.session.Role

/** Perfil / Más. [role] null = sin sesión (no se dibuja la tarjeta). */
data class AccountUiState(
    val role: Role? = null,
    val name: String = "",
    val email: String = "",
    val phone: String? = null,
    /** Firmada, vence en una hora: si no carga se ven las iniciales. */
    val avatarUrl: String? = null,
    val professionalTitle: String? = null,
    /** Solo el alumno, si ya abrió el chat alguna vez. */
    val trainerName: String? = null,
    /** El perfil ya se bajó alguna vez (el teléfono solo se conoce desde ahí). */
    val everLoaded: Boolean = false,
    val offline: Boolean = false,
    val refreshFailed: Boolean = false,
    val passwordChanged: Boolean = false,
)
