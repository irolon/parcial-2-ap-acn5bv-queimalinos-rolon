package com.fittrainer.data.workout

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.di.ApplicationScope
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Avisa al backend que el alumno empezó (o descartó) una sesión (GX4-M1). Es "si se puede": nunca
 * lanza, no muestra errores y no se reintenta. El alta definitiva la sigue haciendo SessionUploader.
 */
@Singleton
class OpenSessionNotifier @Inject constructor(
    private val api: SessionApi,
    @param:ApplicationScope private val scope: CoroutineScope,
) {
    private val opening = ConcurrentHashMap<String, Job>()

    fun open(ownerId: String, sessionId: String, routineId: String?, startedAt: Instant) {
        val job = scope.launch {
            try {
                api.create(RequiredUser(ownerId), CreateSessionRequest(sessionId, routineId, startedAt.toString(), finishedAt = null))
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // Si no se pudo, la sesión se sube entera al terminar.
            }
        }
        opening[sessionId] = job
        job.invokeOnCompletion { opening.remove(sessionId, job) }
    }

    /** Borra la sesión abierta; espera a que termine su apertura, si sigue en vuelo, para que no la "resucite". */
    fun close(ownerId: String, sessionId: String) {
        scope.launch {
            try {
                opening[sessionId]?.join()
                api.discard(RequiredUser(ownerId), sessionId)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // 404 incluido: si ya no está, no hay nada que borrar.
            }
        }
    }
}
