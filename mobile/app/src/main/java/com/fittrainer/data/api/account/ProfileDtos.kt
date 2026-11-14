package com.fittrainer.data.api.account

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Lo que usa el perfil de la ficha del alumno (`GET /students/:id`) y de `GET /auth/me`; el resto se ignora. */
@Serializable
data class ProfileDto(
    val id: String,
    val name: String,
    val email: String,
    val phone: String? = null,
    /** Ya firmada por el backend: vence en una hora. */
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("professional_title") val professionalTitle: String? = null,
)

@Serializable
data class ProfileResponse(val data: ProfileDto)

@Serializable
data class AvatarDto(@SerialName("avatar_url") val avatarUrl: String? = null)

@Serializable
data class AvatarResponse(val data: AvatarDto)

/** Body de `PUT /auth/password`. Sin push token no se manda el campo (el backend no borra el de este celular). */
@Serializable
data class ChangePasswordRequest(
    @SerialName("current_password") val currentPassword: String,
    @SerialName("new_password") val newPassword: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("push_token") val pushToken: String? = null,
)

/** El access token nuevo (sin el claim de cambio obligatorio). El resto de la respuesta no se usa. */
@Serializable
data class ChangePasswordResponse(val token: String)
