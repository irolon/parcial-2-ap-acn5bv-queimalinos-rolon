package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Encola una pasada cada vez que cambia lo pendiente del alumno logueado (sesiones y feedback, tarjeta 12; spec §4). Leyendo Room
 * cubre los tres casos del spec: terminar una sesión, iniciar sesión y abrir la app.
 */
@Singleton
class SyncTrigger @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val dao: WorkoutDao,
    private val sync: SessionSync,
    private val logger: SyncLogger,
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    fun start(scope: CoroutineScope): Job = scope.launch {
        sessionRepository.session
            .map { (it as? Session.Student)?.user?.id }
            .distinctUntilChanged()
            .flatMapLatest { owner ->
                // Por dueño: al volver a entrar el conteo se vuelve a evaluar desde cero.
                if (owner == null) emptyFlow() else dao.observeUploadCounts(owner).map { it.pending + it.pendingFeedback }.distinctUntilChanged().withPrevious()
            }
            .filter { (_, pending) -> pending > 0 }
            // Solo es trabajo nuevo si crecieron las pendientes (se terminó una sesión). La primera lectura
            // (abrir la app, login) o una que baja (la pasada va subiendo) respeta la que ya espera.
            .collect { (before, pending) -> enqueue(newWork = before != null && pending > before) }
    }

    /** Un error al encolar (Room, WorkManager) no puede matar el disparador por el resto del proceso. */
    private suspend fun enqueue(newWork: Boolean) {
        try {
            sync.enqueue(newWork)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            logger.enqueueFailed(e)
        }
    }
}

/** Cada valor junto con el anterior (null en el primero). */
private fun <T> Flow<T>.withPrevious(): Flow<Pair<T?, T>> = flow {
    var previous: T? = null
    collect { value ->
        emit(previous to value)
        previous = value
    }
}
