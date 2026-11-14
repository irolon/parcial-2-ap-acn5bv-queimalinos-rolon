package com.fittrainer.ui.account.edit

import com.fittrainer.data.account.ProfileField
import com.fittrainer.data.session.Role

/** Editar perfil. [loaded] false = todavía no hay perfil en Room (el formulario no se muestra). */
data class EditProfileUiState(
    val loaded: Boolean = false,
    val role: Role? = null,
    val form: EditProfileForm = EditProfileForm(),
    val email: String = "",
    val avatarUrl: String? = null,
    val fieldErrors: Map<ProfileField, String> = emptyMap(),
    /** Error general del guardado (red, servidor). */
    val error: String? = null,
    val saving: Boolean = false,
    val canSave: Boolean = false,
    val photoBusy: Boolean = false,
    val photoError: String? = null,
    val offline: Boolean = false,
    /** Guardó: la pantalla vuelve atrás. */
    val saved: Boolean = false,
)
