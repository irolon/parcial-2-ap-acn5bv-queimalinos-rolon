package com.fittrainer.data.invitation

import com.fittrainer.data.api.InvitationApi
import com.fittrainer.data.repository.DataException
import java.time.OffsetDateTime
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException

/**
 * Lee una invitación por su token. Es online a propósito (como el login): no se guarda en Room
 * porque solo sirve para el alta, que también necesita red.
 */
class InvitationRepository @Inject constructor(
    private val api: InvitationApi,
) {
    suspend fun get(token: String): Result<Invitation> = try {
        val dto = api.get(token)
        Result.success(
            Invitation(
                trainerName = dto.trainer.name,
                studentName = dto.studentName,
                studentEmail = dto.studentEmail,
                goal = dto.goal,
                // Supabase manda "+00:00" y microsegundos: OffsetDateTime acepta eso y también "Z".
                expiresAt = OffsetDateTime.parse(dto.expiresAt).toInstant(),
            ),
        )
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toInvitationError(), e))
    }
}
