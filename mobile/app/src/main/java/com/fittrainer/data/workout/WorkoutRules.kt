package com.fittrainer.data.workout

import java.time.Duration
import java.time.Instant

// Reglas puras de la sesión (spec §3 y §4): sin Room, sin Android, sin reloj propio.

fun Workout.exercise(position: Int): WorkoutExercise = exercises.first { it.position == position }

fun Workout.setAt(position: Int, setNumber: Int): WorkoutSet? =
    sets.firstOrNull { it.position == position && it.setNumber == setNumber }

/** Primera serie sin hacer del ejercicio; null si están todas. */
fun Workout.firstPendingSet(position: Int): Int? =
    (1..exercise(position).totalSets).firstOrNull { setAt(position, it) == null }

/**
 * Adónde va el cursor después de confirmar [confirmed] (que todavía no está en [sets]): la próxima
 * serie pendiente del mismo ejercicio; si no queda, el primer ejercicio en orden con series
 * pendientes; null si no queda nada.
 */
fun Workout.nextAfter(confirmed: Cursor): Cursor? {
    val done = sets.map { it.position to it.setNumber }.toSet() + (confirmed.position to confirmed.setNumber)
    fun pending(e: WorkoutExercise) = (1..e.totalSets).firstOrNull { (e.position to it) !in done }
    pending(exercise(confirmed.position))?.let { return Cursor(confirmed.position, it) }
    return exercises.sortedBy { it.position }.firstNotNullOfOrNull { e -> pending(e)?.let { Cursor(e.position, it) } }
}

fun Workout.pendingSets(): Int =
    exercises.sumOf { e -> (1..e.totalSets).count { setAt(e.position, it) == null } }

/** [cursor] es la única serie que falta de toda la sesión: el CTA dice "terminar". */
fun Workout.isLastPending(cursor: Cursor): Boolean =
    setAt(cursor.position, cursor.setNumber) == null && pendingSets() == 1

/** Solo se reemplaza un ejercicio sin series hechas en esta sesión. */
fun Workout.canReplace(position: Int): Boolean = sets.none { it.position == position }

/**
 * Precarga (spec §2): serie ya hecha → lo registrado (corrección); si no, la última serie de hoy de
 * ese ejercicio; si no, la última vez en este celular ([lastTime]); si no, el plan del PT.
 */
fun Workout.preload(cursor: Cursor, lastTime: WorkoutSet?): Load {
    setAt(cursor.position, cursor.setNumber)?.let { return Load(it.kg, it.reps) }
    sets.filter { it.position == cursor.position && it.setNumber < cursor.setNumber }
        .maxByOrNull { it.setNumber }
        ?.let { return Load(it.kg, it.reps) }
    lastTime?.let { return Load(it.kg, it.reps) }
    val e = exercise(cursor.position)
    return Load(e.suggestedKg ?: 0.0, e.targetReps)
}

fun Workout.lastDoneSet(): WorkoutSet? = sets.maxByOrNull { it.executedAt }

fun Workout.summary(now: Instant): WorkoutSummary =
    WorkoutSummary(sets.size, Duration.between(startedAt, now).toMinutes(), id)

/** null: el ejercicio no tiene descanso. */
fun startRest(seconds: Int, now: Instant): Rest? =
    if (seconds <= 0) null else Rest(now.plusSeconds(seconds.toLong()), seconds, null)

val Rest.isPaused: Boolean get() = pausedRemainingMs != null

fun Rest.remainingMs(now: Instant): Long =
    pausedRemainingMs ?: endsAt?.let { (it.toEpochMilli() - now.toEpochMilli()).coerceAtLeast(0) } ?: 0

fun Rest.isOver(now: Instant): Boolean = !isPaused && remainingMs(now) == 0L

/** ±15 s: nunca baja de 0; null = el descanso terminó. El total crece para que el anillo no se pase. */
fun Rest.adjust(deltaSeconds: Int, now: Instant): Rest? {
    val left = remainingMs(now) + deltaSeconds * 1_000L
    if (left <= 0) return null
    val total = maxOf(totalSeconds, ((left + 999) / 1_000).toInt())
    return if (isPaused) copy(pausedRemainingMs = left, totalSeconds = total)
    else copy(endsAt = now.plusMillis(left), totalSeconds = total)
}

fun Rest.togglePause(now: Instant): Rest =
    if (isPaused) Rest(now.plusMillis(pausedRemainingMs!!), totalSeconds, null)
    else Rest(null, totalSeconds, remainingMs(now))

/**
 * Para el service: el descanso que corría ([previousEndsAt]) dejó de correr porque llegó a su fin, no
 * porque se saltó, se pausó o se ajustó (en esos casos el fin anterior todavía no pasó).
 */
fun restJustEnded(previousEndsAt: Instant?, currentEndsAt: Instant?, now: Instant): Boolean =
    previousEndsAt != null && currentEndsAt != previousEndsAt && !previousEndsAt.isAfter(now)
