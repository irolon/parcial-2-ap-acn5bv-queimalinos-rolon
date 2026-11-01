package com.fittrainer.testing.fakes.invitation

import com.fittrainer.data.api.invitation.CreateInvitationRequest
import com.fittrainer.data.api.invitation.CreatedInvitationDto
import com.fittrainer.data.api.invitation.CreatedInvitationResponse
import com.fittrainer.data.api.invitation.TrainerInvitationApi
import kotlinx.coroutines.CompletableDeferred

/** PNG mínimo de 1 byte en data URL (alcanza para decodificar). */
const val QR_DATA_URL = "data:image/png;base64,iVBORw0KGgo="

/** API falsa: guarda los requests, espera [gate] si no es null y lanza [error] si no es null. */
class FakeTrainerInvitationApi : TrainerInvitationApi {
    val requests = mutableListOf<CreateInvitationRequest>()
    var error: Throwable? = null
    var gate: CompletableDeferred<Unit>? = null
    var qr: String? = QR_DATA_URL

    override suspend fun create(body: CreateInvitationRequest): CreatedInvitationResponse {
        requests += body
        gate?.await()
        error?.let { throw it }
        return CreatedInvitationResponse(
            CreatedInvitationDto(
                joinUrl = "http://localhost:5173/join?token=abc",
                qrBase64 = qr,
                whatsappShareUrl = if (body.deliveryChannel == "both") "https://wa.me/5491133334444?text=Hola" else null,
                expiresAt = "2026-11-03T12:00:00.123+00:00",
            ),
        )
    }
}
