package com.fittrainer.data.workout

import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.routine.Routine
import java.time.Clock
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

enum class SaveOutcome { Corrected, Advanced, AllDone }

/**
 * Única puerta a las sesiones (spec §4). La usan la pantalla y el WorkoutService: cada operación
 * relee la sesión de Room adentro de un Mutex, así ninguno pisa lo que acaba de escribir el otro.
 */
@Singleton
class WorkoutRepository @Inject constructor(
    private val dao: WorkoutDao,
    private val clock: Clock,
    private val ids: IdGenerator,
) {
    private val mutex = Mutex()

    fun observeActive(ownerId: String): Flow<Workout?> =
        dao.observeActive(ownerId).map { it?.toDomain() }.distinctUntilChanged()

    suspend fun lastSetFor(ownerId: String, exerciseId: String): WorkoutSet? =
        dao.lastSetFor(ownerId, exerciseId)?.toDomain()

    /** Empieza la sesión de [routine]. Si ya hay una abierta devuelve esa: una sola a la vez. */
    suspend fun start(ownerId: String, routine: Routine): String = mutex.withLock {
        dao.getActive(ownerId)?.let { return it.session.id }
        require(routine.exercises.isNotEmpty()) { "La rutina no tiene ejercicios" }
        val workout = Workout(
            id = ids.newId(),
            ownerId = ownerId,
            routineId = routine.id,
            routineName = routine.name,
            startedAt = clock.instant(),
            exercises = routine.exercises.mapIndexed { i, e -> e.toWorkoutExercise(i) },
            sets = emptyList(),
            cursor = Cursor(0, 1),
            rest = null,
        )
        dao.start(workout.toSessionEntity(), workout.exercises.map { it.toEntity(workout.id) })
        workout.id
    }

    /**
     * Guarda la serie (position, setNumber). Si ya existía es una corrección: mismo id y hora, sin
     * tocar el descanso ni el cursor (salvo que el cursor esté en un ejercicio completo: pasa a la
     * primera serie pendiente). Si es nueva, avanza el cursor y arranca el descanso del ejercicio.
     */
    suspend fun saveSet(ownerId: String, position: Int, setNumber: Int, load: Load): SaveOutcome? =
        withActive(ownerId) { w ->
            w.setAt(position, setNumber)?.let { old ->
                val corrected = old.copy(kg = load.kg, reps = load.reps).toEntity(w.id)
                // Corrigió parado en un ejercicio ya completo: el cursor vuelve a lo que falta.
                val back = if (w.firstPendingSet(w.cursor.position) == null) w.nextAfter(w.cursor) else null
                if (back == null) dao.upsertSet(corrected) else dao.saveSet(corrected, w.copy(cursor = back).toSessionEntity())
                return@withActive SaveOutcome.Corrected
            }
            val e = w.exercise(position)
            val now = clock.instant()
            val set = WorkoutSet(
                ids.newId(), position, e.exerciseId, e.originalExerciseId, e.routineExerciseId,
                setNumber, load.kg, load.reps, now,
            )
            val next = w.nextAfter(Cursor(position, setNumber))
            val updated = if (next == null) w.copy(rest = null) else w.copy(cursor = next, rest = startRest(e.restTotal, now))
            dao.saveSet(set.toEntity(w.id), updated.toSessionEntity())
            if (next == null) SaveOutcome.AllDone else SaveOutcome.Advanced
        }

    /** Salta a otro ejercicio: su primera serie pendiente (o la última, si ya lo completó). */
    suspend fun moveTo(ownerId: String, position: Int) = withActive(ownerId) { w ->
        val setNumber = w.firstPendingSet(position) ?: w.exercise(position).totalSets
        dao.updateSession(w.copy(cursor = Cursor(position, setNumber)).toSessionEntity())
    }

    suspend fun adjustRest(ownerId: String, deltaSeconds: Int) = updateRest(ownerId) { it.adjust(deltaSeconds, clock.instant()) }

    suspend fun toggleRestPause(ownerId: String) = updateRest(ownerId) { it.togglePause(clock.instant()) }

    suspend fun skipRest(ownerId: String) = updateRest(ownerId) { null }

    /** Lo llaman la pantalla y el service al llegar a 0: si todavía no venció, no hace nada. */
    suspend fun endRestIfOver(ownerId: String) = updateRest(ownerId) { if (it.isOver(clock.instant())) null else it }

    /** false si el ejercicio ya tiene series hechas (spec §3). */
    suspend fun replaceExercise(ownerId: String, position: Int, replacement: LibraryExercise): Boolean =
        withActive(ownerId) { w ->
            if (!w.canReplace(position)) return@withActive false
            val e = w.exercise(position)
            val original = e.originalExerciseId ?: e.exerciseId
            val replaced = e.copy(
                exerciseId = replacement.id,
                originalExerciseId = original.takeIf { it != replacement.id },
                name = replacement.name,
                muscleGroup = replacement.muscleGroup,
                equipment = replacement.equipment,
                description = replacement.description,
                videoUrl = replacement.videoUrl,
            )
            dao.updateExercise(replaced.toEntity(w.id))
            true
        } ?: false

    /** Termina la sesión. Sin series se descarta (no se guardan sesiones vacías) y devuelve null. */
    suspend fun finish(ownerId: String): WorkoutSummary? = withActive(ownerId) { w ->
        if (w.sets.isEmpty()) {
            dao.deleteSession(w.id)
            return@withActive null
        }
        val now = clock.instant()
        dao.updateSession(w.copy(rest = null).toSessionEntity(STATUS_FINISHED, now.toEpochMilli()))
        w.summary(now)
    }

    suspend fun discard(ownerId: String) = withActive(ownerId) { dao.deleteSession(it.id) }

    private suspend fun updateRest(ownerId: String, change: (Rest) -> Rest?) = withActive(ownerId) { w ->
        val rest = w.rest ?: return@withActive
        dao.updateSession(w.copy(rest = change(rest)).toSessionEntity())
    }

    /** null si el alumno no tiene una sesión abierta. */
    private suspend fun <T> withActive(ownerId: String, block: suspend (Workout) -> T): T? = mutex.withLock {
        val workout = dao.getActive(ownerId)?.toDomain() ?: return null
        block(workout)
    }
}
