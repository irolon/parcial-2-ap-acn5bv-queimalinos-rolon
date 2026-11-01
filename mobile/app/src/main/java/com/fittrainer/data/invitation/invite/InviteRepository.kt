package com.fittrainer.data.invitation.invite

import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.api.invitation.TrainerInvitationApi
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.toDataError
import java.time.Instant
import java.time.OffsetDateTime
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import retrofit2.HttpException

/** La invitación recién creada. qrPng == null: el backend no mandó un QR que se pueda leer. */
class CreatedInvitation(
    val joinUrl: String,
    val qrPng: ByteArray?,
    val whatsappUrl: String?,
    val expiresAt: Instant,
)

sealed interface InviteResult {
    class Created(val invitation: CreatedInvitation) : InviteResult

    /** El backend rechazó campos (400) o el email ya es de un alumno (409). */
    data class Rejected(val fields: Map<InviteField, String>, val message: String?) : InviteResult

    data class Failed(val error: DataError) : InviteResult
}

/**
 * Crea invitaciones (POST /invitations). Es online a propósito: no hay nada que cachear, la
 * invitación se muestra una vez y el link vive en el estado de la pantalla.
 */
class InviteRepository @Inject constructor(private val api: TrainerInvitationApi) {

    suspend fun create(form: InviteForm): InviteResult = try {
        val dto = api.create(form.toRequest()).data
        InviteResult.Created(
            CreatedInvitation(
                joinUrl = dto.joinUrl,
                qrPng = decodeDataUrl(dto.qrBase64),
                whatsappUrl = dto.whatsappShareUrl?.takeIf { it.isNotBlank() },
                expiresAt = OffsetDateTime.parse(dto.expiresAt).toInstant(),
            ),
        )
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        rejected(e) ?: InviteResult.Failed(e.toDataError())
    } catch (e: Exception) {
        InviteResult.Failed(e.toDataError())
    }

    private fun rejected(e: HttpException): InviteResult? {
        val envelope = e.errorEnvelope() ?: return null
        return when (envelope.code) {
            "STUDENT_EMAIL_EXISTS" -> InviteResult.Rejected(mapOf(InviteField.EMAIL to EMAIL_TAKEN), null)
            "VALIDATION_ERROR" -> {
                val fields = envelope.details.mapNotNull { d -> inviteFieldOf(d.field)?.let { it to d.message.orEmpty() } }
                InviteResult.Rejected(fields.toMap(), envelope.message.takeIf { fields.isEmpty() })
            }
            else -> null
        }
    }

    private companion object {
        const val EMAIL_TAKEN = "Ya hay un alumno con ese email"
    }
}
