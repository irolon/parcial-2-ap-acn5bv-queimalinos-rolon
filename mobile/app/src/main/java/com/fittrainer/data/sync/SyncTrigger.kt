package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Encola una pasada cada vez que cambia lo pendiente del alumno logueado (spec §4). Leyendo Room
 * cubre los tres casos del spec: terminar una sesión, iniciar sesión y abrir la app.
 */
@Singleton
class SyncTrigger @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val dao: WorkoutDao,
    private val sync: SessionSync,
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    fun start(scope: CoroutineScope): Job = scope.launch {
        sessionRepository.session
            .map { (it as? Session.Student)?.user?.id }
            .distinctUntilChanged()
            .flatMapLatest { owner ->
                // Por dueño: al volver a entrar el conteo se vuelve a evaluar desde cero.
                if (owner == null) emptyFlow() else dao.observeUploadCounts(owner).map { it.pending }.distinctUntilChanged()
            }
            .filter { it > 0 }
            .collect { sync.enqueue() }
    }
}
