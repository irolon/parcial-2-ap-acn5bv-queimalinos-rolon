package com.fittrainer.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Path

@Serializable
data class InvitationTrainerDto(val id: String, val name: String)

@Serializable
data class InvitationDto(
    val trainer: InvitationTrainerDto,
    @SerialName("student_name") val studentName: String,
    @SerialName("student_email") val studentEmail: String,
    // Opcional desde la web: el backend manda null o no lo manda.
    val goal: String? = null,
    @SerialName("expires_at") val expiresAt: String,
)

/** Invitaciones (público). Se sirve con el cliente HTTP "auth": no hay sesión todavía. */
interface InvitationApi {
    @GET("invitations/{token}")
    suspend fun get(@Path("token") token: String): InvitationDto
}
