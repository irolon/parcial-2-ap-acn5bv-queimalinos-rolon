package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import javax.inject.Inject
import kotlinx.coroutines.flow.first

enum class PassResult { DONE, RETRY }

/** Una pasada de subida, vista desde el worker (permite probarlo con una pasada falsa). */
fun interface UploadPass {
    suspend fun run(): PassResult
}

/**
 * Una pasada de subida (spec §4): las sesiones terminadas y pendientes del alumno con sesión
 * iniciada, de a una y en orden. Lo que el servidor resolvió se guarda en Room antes de seguir.
 */
class SyncPass @Inject constructor(
    private val dao: WorkoutDao,
    private val uploader: SessionUploader,
    private val sessionRepository: SessionRepository,
) : UploadPass {
    override suspend fun run(): PassResult {
        val owner = currentStudent() ?: return PassResult.DONE
        for (session in dao.pendingUploads(owner)) {
            // Si el alumno cerró sesión (y quizá entró otro) a mitad de la pasada, no se sigue. Lo
            // pendiente queda en Room y el próximo login de su dueño vuelve a encolar. Entre este chequeo
            // y cada request, AuthInterceptor frena la que saldría con otra cuenta (ACCOUNT_CHANGED).
            if (currentStudent() != owner) return PassResult.DONE
            val result = uploader.upload(owner, session, dao.pendingSets(session.id))
            val rejected = result.stop == StopReason.SESSION_REJECTED
            // Si no se llegó a crear, la sesión no existe en el servidor: no se puede dar por subida.
            if (result.created || rejected) {
                dao.applyUpload(session.id, result.sets.synced, result.sets.failed, rejected)
                // Sesión rechazada entera: su feedback no tiene dónde ir, se descarta junto con ella.
                if (rejected && !result.created && session.feedbackState == FEEDBACK_PENDING) {
                    dao.markFeedbackRejected(session.id)
                }
                // El POST llevó el feedback que había al leerla: queda subido si nadie lo cambió mientras tanto.
                if (result.created && session.feedbackState == FEEDBACK_PENDING) {
                    dao.markFeedbackSynced(session.id, session.rpe, session.notes)
                }
            }
            when (result.stop) {
                StopReason.RETRY -> return PassResult.RETRY
                // Si el refresh fue rechazado, TokenAuthenticator ya cerró la sesión: todo queda PENDING
                // hasta el próximo login. Si la sesión sigue abierta, el refresh falló por red o 5xx: es
                // pasajero y se reintenta (nada más volvería a encolar mientras siga logueado).
                StopReason.UNAUTHORIZED ->
                    return if (currentStudent() == owner) PassResult.RETRY else PassResult.DONE
                // 403 no depende del token: reintentar no lo arregla. Todo queda PENDING (spec §5).
                StopReason.FORBIDDEN -> return PassResult.DONE
                StopReason.ACCOUNT_CHANGED -> return PassResult.DONE
                StopReason.SESSION_REJECTED, null -> Unit
            }
        }
        return sendFeedback(owner)
    }

    /** Feedback de sesiones ya subidas (spec §4 de la tarjeta 12): un PATCH por sesión. */
    private suspend fun sendFeedback(owner: String): PassResult {
        for (session in dao.pendingFeedback(owner)) {
            if (currentStudent() != owner) return PassResult.DONE
            when (uploader.sendFeedback(owner, session)) {
                FeedbackOutcome.SENT -> dao.markFeedbackSynced(session.id, session.rpe, session.notes)
                FeedbackOutcome.REJECTED -> dao.markFeedbackRejected(session.id)
                FeedbackOutcome.RETRY -> return PassResult.RETRY
                FeedbackOutcome.UNAUTHORIZED -> return if (currentStudent() == owner) PassResult.RETRY else PassResult.DONE
                FeedbackOutcome.KEEP -> return PassResult.DONE
            }
        }
        return PassResult.DONE
    }

    private suspend fun currentStudent(): String? =
        (sessionRepository.session.first() as? Session.Student)?.user?.id
}
