package com.fittrainer.data.api.invitation

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Invitaciones del lado del entrenador. A diferencia de InvitationApi (pública, sin sesión), va por
 * el cliente con Bearer: POST /invitations necesita al entrenador logueado.
 */
interface TrainerInvitationApi {
    @POST("invitations")
    suspend fun create(@Body body: CreateInvitationRequest): CreatedInvitationResponse
}

/** Los opcionales en null se mandan como null: el backend los toma como ausentes. */
@Serializable
data class CreateInvitationRequest(
    @SerialName("student_name") val studentName: String,
    @SerialName("student_email") val studentEmail: String,
    @SerialName("student_phone") val studentPhone: String?,
    val goal: String?,
    val level: String?,
    @SerialName("gym_equipment") val gymEquipment: List<String>?,
    val injuries: String?,
    @SerialName("delivery_channel") val deliveryChannel: String,
)

@Serializable
data class CreatedInvitationResponse(val data: CreatedInvitationDto)

@Serializable
data class CreatedInvitationDto(
    @SerialName("join_url") val joinUrl: String,
    @SerialName("qr_base64") val qrBase64: String? = null,
    @SerialName("whatsapp_share_url") val whatsappShareUrl: String? = null,
    @SerialName("expires_at") val expiresAt: String,
)
