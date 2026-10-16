package com.fittrainer.data.invitation

import com.fittrainer.data.api.errorCode
import com.fittrainer.data.repository.DataError
import java.io.IOException
import java.time.Instant
import retrofit2.HttpException

/** Datos que el entrenador cargó en la invitación. Se muestran sin editar. */
data class Invitation(
    val trainerName: String,
    val studentName: String,
    val studentEmail: String,
    val goal: String,
    val expiresAt: Instant,
)

/** Errores de los endpoints de invitación y alta: se distinguen por `error.code`, no solo por el status. */
internal fun Exception.toInvitationError(): DataError = when (this) {
    is IOException -> DataError.Offline
    is HttpException -> when (errorCode()) {
        "INVITATION_NOT_FOUND" -> DataError.InvitationNotFound
        "INVITATION_EXPIRED" -> DataError.InvitationExpired
        "INVITATION_ALREADY_USED" -> DataError.InvitationUsed
        "STUDENT_EMAIL_EXISTS" -> DataError.StudentEmailExists
        else -> DataError.Http(code())
    }
    else -> DataError.Unknown
}
