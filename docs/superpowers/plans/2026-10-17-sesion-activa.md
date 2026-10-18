---
tags: [plan]
tarjeta: 10
---
# Sesión activa + timer de descanso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El alumno entrena la rutina del día desde el celular: registra peso y reps de cada serie en uno o dos toques, descansa con un timer que suena con el celular bloqueado y, si la app se cierra, retoma donde estaba.

**Architecture:** La sesión vive en Room (v4: `workout_sessions`, `workout_exercises`, `workout_sets`), con UUID del cliente y `executed_at` real. Un `WorkoutRepository` singleton, con un `Mutex`, es la única puerta de escritura: lo usan la pantalla y el `WorkoutService` (foreground service `specialUse`, que muestra la notificación fija y avisa el fin del descanso). Las reglas (precarga, avance, descanso, reemplazo) son funciones puras en `data/workout/WorkoutRules.kt`.

**Tech Stack:** Kotlin, Jetpack Compose (Material 3), Hilt, Room 2.7.2 (KSP, AutoMigration), NotificationCompat + `ServiceCompat.startForeground`, JUnit4 + kotlinx-coroutines-test.

**Spec:** `docs/superpowers/specs/2026-10-17-sesion-activa-design.md`

## Global Constraints

- Ningún archivo de código (tests incluidos) pasa de **200 líneas físicas**. `gradlew checkFileLength` lo verifica.
- Todo va ordenado capa → módulo → archivo. Los tests copian el árbol de `main/`.
- **Room es la única fuente de verdad.** La UI lee de Room vía repositorio y nada de `ui/` importa Retrofit, OkHttp ni las clases `data/db`.
- Escrituras offline-first: ids UUID generados en el celular; `executedAt` es el momento real de la serie.
- **Nunca migraciones destructivas:** `AutoMigration(3→4)` con su caso en `FitTrainerDatabaseMigrationTest`, y `app/schemas/.../4.json` se versiona.
- En el código la sesión de entrenamiento se llama **workout** (`data/session/` es la sesión de login). En la UI dice "sesión".
- Valores por defecto: `sets` null → 3, `reps` null → 10, `restSeconds` null → 90 s, `suggestedKg` null y sin historial → 0 kg.
- Diseño:
  - tema oscuro;
  - azul de marca `FtColors.Brand`;
  - peso y reps en **72 sp**;
  - todo lo tocable mide al menos `Spacing.minTouchTarget` (44 dp);
  - los íconos salen solo de `material-icons-core`; no hay extended.
- Los comentarios del código van en español rioplatense, como el resto del repo.
- **Git:** los agentes no commitean ni agregan al stage. Los pasos "Cerrar la tarea" solo corren verificaciones.
- Comando base, desde `mobile/`: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew …`

## Review Focus

1. **Escrituras cruzadas entre la pantalla y el service:** las dos tocan la misma fila, por ejemplo cuando el service termina el descanso mientras la pantalla ajusta ±15. Lo esperable es que ninguna pise el estado nuevo con uno viejo. Por eso el repositorio relee de Room adentro de un `Mutex`. Lo fija un test de la Task 3 (`ajustar un descanso ya terminado no lo revive`).
2. **Doble toque en "Serie completa":** no puede crear dos series ni saltear una. El segundo toque corrige la misma serie. Lo fija un test de la Task 3 (`confirmar dos veces la misma serie no la duplica`).
3. **Terminar la sesión:** la fila deja de ser `ACTIVE` antes de que llegue el resumen, y la pantalla no tiene que cerrarse sin mostrarlo. Lo fija un test de la Task 4 (`terminar muestra el resumen y no cierra la pantalla`).
4. **Reabrir con el descanso vencido** (la app estuvo cerrada más que el descanso): tiene que volver a la serie y no mostrar 0:00 colgado. Lo fija un test de la Task 4 (`al abrir con el descanso vencido vuelve a la serie`).
5. **Reemplazar dos veces, o volver al ejercicio original:** `originalExerciseId` guarda el planificado y vuelve a null si se elige el original. Lo fija un test de la Task 3 (`reemplazar dos veces conserva el original y volver lo limpia`).

---

## File Structure

| Archivo (bajo `mobile/app/src/`) | Responsabilidad | Tarea |
|---|---|---|
| `main/.../data/workout/Workout.kt` | modelo de dominio (Workout, WorkoutExercise, WorkoutSet, Cursor, Rest, Load, WorkoutSummary) | 1 |
| `main/.../data/workout/WorkoutRules.kt` | reglas puras: precarga, avance, descanso, reemplazo, resumen | 1 |
| `test/.../testing/fakes/workout/WorkoutFixtures.kt` | builders de Workout para tests | 1 |
| `test/.../data/workout/WorkoutRulesTest.kt`, `RestRulesTest.kt` | tests de las reglas | 1 |
| `main/.../data/db/workout/WorkoutEntities.kt`, `WorkoutDao.kt` | Room | 2 |
| `main/.../data/db/FitTrainerDatabase.kt`, `di/DatabaseModule.kt` | v4 + provider | 2 |
| `androidTest/.../data/db/workout/WorkoutDaoTest.kt`, `data/db/FitTrainerDatabaseMigrationTest.kt` | DAO + migración 3→4 | 2 |
| `main/.../data/workout/WorkoutMapper.kt`, `IdGenerator.kt`, `WorkoutRepository.kt`, `di/WorkoutModule.kt` | repositorio | 3 |
| `test/.../testing/fakes/workout/FakeWorkoutDao.kt`, `test/.../data/workout/WorkoutRepositoryTest.kt`, `WorkoutRepositorySetsTest.kt` | tests del repo | 3 |
| `main/.../ui/workout/WorkoutUiState.kt`, `WorkoutViewModel.kt`, `WorkoutTexts.kt` | estado y VM | 4 |
| `test/.../ui/workout/WorkoutViewModelTest.kt`, `WorkoutTextsTest.kt` | tests | 4 |
| `main/.../ui/workout/service/WorkoutService.kt`, `WorkoutNotifications.kt`, `NotificationTexts.kt`, `res/drawable/ic_stat_workout.xml`, `AndroidManifest.xml` | timer en segundo plano | 5 |
| `test/.../ui/workout/service/NotificationTextsTest.kt` | tests | 5 |
| `main/.../ui/workout/WorkoutScreen.kt`, `WorkoutContent.kt`, `components/*.kt` | pantallas | 6 |
| `main/.../data/workout/WorkoutLaunchRequests.kt`, `ui/workout/WorkoutEntryViewModel.kt`, `ui/workout/components/ActiveWorkoutSignOutDialog.kt` | entrada y logout | 7 |
| `main/.../ui/today/TodayScreen.kt`, `ui/today/components/RoutineHeroCard.kt`, `navigation/RoleTabs.kt`, `navigation/RoleShell.kt`, `MainActivity.kt` | integración | 7 |
| `test/.../ui/workout/WorkoutEntryViewModelTest.kt` | tests | 7 |

`main/...` = `main/java/com/fittrainer`; lo mismo para `test/...` y `androidTest/...`.

---

### Task 1: Dominio y reglas puras

**Files:**
- Create: `main/java/com/fittrainer/data/workout/Workout.kt`
- Create: `main/java/com/fittrainer/data/workout/WorkoutRules.kt`
- Create: `test/java/com/fittrainer/testing/fakes/workout/WorkoutFixtures.kt`
- Test: `test/java/com/fittrainer/data/workout/WorkoutRulesTest.kt`, `test/java/com/fittrainer/data/workout/RestRulesTest.kt`

**Interfaces:**
- Consumes: nada.
- Produces:
  - **tipos:** `Workout`, `WorkoutExercise` (con `totalSets`, `targetReps`, `restTotal`), `WorkoutSet`, `Cursor`, `Rest`, `Load`, `WorkoutSummary`, y las constantes `DEFAULT_SETS`, `DEFAULT_REPS`, `DEFAULT_REST_SECONDS`;
  - **extensiones de `Workout`:** `exercise(position)`, `setAt(position, setNumber)`, `firstPendingSet(position): Int?`, `nextAfter(confirmed: Cursor): Cursor?`, `pendingSets(): Int`, `isLastPending(cursor): Boolean`, `canReplace(position): Boolean`, `preload(cursor, lastTime: WorkoutSet?): Load`, `lastDoneSet(): WorkoutSet?`, `summary(now): WorkoutSummary`;
  - **funciones del descanso:** `startRest(seconds, now): Rest?`, y las extensiones `Rest.remainingMs(now)`, `Rest.isPaused`, `Rest.isOver(now)`, `Rest.adjust(deltaSeconds, now): Rest?`, `Rest.togglePause(now): Rest`;
  - **para el service:** `restJustEnded(previousEndsAt: Instant?, currentEndsAt: Instant?, now: Instant): Boolean`;
  - **fixtures:** `workout(...)`, `exercise(...)`, `doneSet(...)` en `testing.fakes.workout`.

- [ ] **Step 1: Escribir el modelo** `data/workout/Workout.kt`

```kotlin
package com.fittrainer.data.workout

import java.time.Instant

/** Valores por defecto cuando la rutina no los trae (spec §3). */
const val DEFAULT_SETS = 3
const val DEFAULT_REPS = 10
const val DEFAULT_REST_SECONDS = 90

/** Sesión de entrenamiento abierta, tal como la ve la app (sin nada de Room). */
data class Workout(
    val id: String,
    val ownerId: String,
    val routineId: String?,
    val routineName: String,
    val startedAt: Instant,
    /** Copia del plan al empezar, ordenada por posición. */
    val exercises: List<WorkoutExercise>,
    val sets: List<WorkoutSet>,
    val cursor: Cursor,
    /** null: no hay descanso en curso. */
    val rest: Rest?,
)

/** Un ejercicio de la copia del plan. sets/reps/restSeconds quedan como vinieron (pueden ser null). */
data class WorkoutExercise(
    val position: Int,
    val routineExerciseId: String?,
    val exerciseId: String,
    /** El ejercicio planificado, si se reemplazó. */
    val originalExerciseId: String?,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val description: String?,
    val videoUrl: String?,
    val sets: Int?,
    val reps: Int?,
    val restSeconds: Int?,
    val suggestedKg: Double?,
) {
    val totalSets: Int get() = (sets ?: DEFAULT_SETS).coerceAtLeast(1)
    val targetReps: Int get() = reps ?: DEFAULT_REPS
    val restTotal: Int get() = (restSeconds ?: DEFAULT_REST_SECONDS).coerceAtLeast(0)
}

/** Serie confirmada. exerciseId: el realmente ejecutado. */
data class WorkoutSet(
    val id: String,
    val position: Int,
    val exerciseId: String,
    val originalExerciseId: String?,
    val routineExerciseId: String?,
    val setNumber: Int,
    val kg: Double,
    val reps: Int,
    val executedAt: Instant,
)

/** Dónde está el alumno: ejercicio (posición) y número de serie (desde 1). */
data class Cursor(val position: Int, val setNumber: Int)

/** endsAt != null: corriendo. pausedRemainingMs != null: en pausa (endsAt queda null). */
data class Rest(val endsAt: Instant?, val totalSeconds: Int, val pausedRemainingMs: Long?)

data class Load(val kg: Double, val reps: Int)

data class WorkoutSummary(val sets: Int, val minutes: Long)
```

- [ ] **Step 2: Escribir los fixtures de test** `testing/fakes/workout/WorkoutFixtures.kt`

```kotlin
package com.fittrainer.testing.fakes.workout

import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Rest
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.data.workout.WorkoutSet
import java.time.Instant

val T0: Instant = Instant.parse("2026-10-17T10:00:00Z")

fun exercise(
    position: Int,
    sets: Int? = 2,
    reps: Int? = 8,
    restSeconds: Int? = 60,
    suggestedKg: Double? = 40.0,
    exerciseId: String = "ex-$position",
) = WorkoutExercise(
    position = position,
    routineExerciseId = "re-$position",
    exerciseId = exerciseId,
    originalExerciseId = null,
    name = "Ejercicio $position",
    muscleGroup = "chest",
    equipment = null,
    description = null,
    videoUrl = null,
    sets = sets,
    reps = reps,
    restSeconds = restSeconds,
    suggestedKg = suggestedKg,
)

fun doneSet(position: Int, setNumber: Int, kg: Double = 40.0, reps: Int = 8, at: Instant = T0) = WorkoutSet(
    id = "set-$position-$setNumber",
    position = position,
    exerciseId = "ex-$position",
    originalExerciseId = null,
    routineExerciseId = "re-$position",
    setNumber = setNumber,
    kg = kg,
    reps = reps,
    executedAt = at,
)

fun workout(
    exercises: List<WorkoutExercise> = listOf(exercise(0), exercise(1)),
    sets: List<WorkoutSet> = emptyList(),
    cursor: Cursor = Cursor(0, 1),
    rest: Rest? = null,
    ownerId: String = "u1",
) = Workout("w-1", ownerId, "rt-1", "Push", T0, exercises, sets, cursor, rest)
```

- [ ] **Step 3: Escribir los tests que fallan** `data/workout/WorkoutRulesTest.kt`

```kotlin
package com.fittrainer.data.workout

import com.fittrainer.testing.fakes.workout.T0
import com.fittrainer.testing.fakes.workout.doneSet
import com.fittrainer.testing.fakes.workout.exercise
import com.fittrainer.testing.fakes.workout.workout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkoutRulesTest {

    @Test fun `los valores que faltan en la rutina toman los de por defecto`() {
        val e = exercise(0, sets = null, reps = null, restSeconds = null)
        assertEquals(3, e.totalSets)
        assertEquals(10, e.targetReps)
        assertEquals(90, e.restTotal)
    }

    @Test fun `despues de una serie sigue la proxima del mismo ejercicio`() {
        assertEquals(Cursor(0, 2), workout().nextAfter(Cursor(0, 1)))
    }

    @Test fun `al completar un ejercicio pasa al primero con series pendientes`() {
        val w = workout(sets = listOf(doneSet(0, 1)), cursor = Cursor(0, 2))
        assertEquals(Cursor(1, 1), w.nextAfter(Cursor(0, 2)))
    }

    @Test fun `si salto un ejercicio vuelve al que quedo pendiente`() {
        val w = workout(
            exercises = listOf(exercise(0), exercise(1), exercise(2)),
            sets = listOf(doneSet(1, 1), doneSet(1, 2), doneSet(2, 1)),
            cursor = Cursor(2, 2),
        )
        assertEquals(Cursor(0, 1), w.nextAfter(Cursor(2, 2)))
    }

    @Test fun `sin series pendientes no hay proxima y la ultima pendiente se reconoce`() {
        val w = workout(sets = listOf(doneSet(0, 1), doneSet(0, 2), doneSet(1, 1)), cursor = Cursor(1, 2))
        assertTrue(w.isLastPending(Cursor(1, 2)))
        assertNull(w.nextAfter(Cursor(1, 2)))
        assertFalse(workout().isLastPending(Cursor(0, 1)))
    }

    @Test fun `la primera serie precarga lo de la ultima vez y si no hay, el plan del PT`() {
        val last = doneSet(0, 3, kg = 50.0, reps = 6)
        assertEquals(Load(50.0, 6), workout().preload(Cursor(0, 1), last))
        assertEquals(Load(40.0, 8), workout().preload(Cursor(0, 1), null))
    }

    @Test fun `sin peso sugerido ni historial arranca en 0 kg con las reps del plan`() {
        val w = workout(exercises = listOf(exercise(0, suggestedKg = null)))
        assertEquals(Load(0.0, 8), w.preload(Cursor(0, 1), null))
    }

    @Test fun `la segunda serie precarga lo que confirmo en la anterior de hoy`() {
        val w = workout(sets = listOf(doneSet(0, 1, kg = 37.5, reps = 10)), cursor = Cursor(0, 2))
        assertEquals(Load(37.5, 10), w.preload(Cursor(0, 2), doneSet(0, 1, kg = 99.0)))
    }

    @Test fun `una serie ya hecha precarga lo registrado para corregirla`() {
        val w = workout(sets = listOf(doneSet(0, 1, kg = 45.0, reps = 7)), cursor = Cursor(0, 2))
        assertEquals(Load(45.0, 7), w.preload(Cursor(0, 1), null))
    }

    @Test fun `solo se reemplaza un ejercicio sin series hechas`() {
        val w = workout(sets = listOf(doneSet(0, 1)))
        assertFalse(w.canReplace(0))
        assertTrue(w.canReplace(1))
    }

    @Test fun `el resumen cuenta series y minutos`() {
        val w = workout(sets = listOf(doneSet(0, 1), doneSet(0, 2)))
        assertEquals(WorkoutSummary(2, 52), w.summary(T0.plusSeconds(52 * 60 + 30)))
        assertEquals(2, w.pendingSets())
    }

    @Test fun `la ultima serie hecha es la de executedAt mas reciente`() {
        val w = workout(sets = listOf(doneSet(1, 1, at = T0.plusSeconds(90)), doneSet(0, 2, at = T0.plusSeconds(10))))
        assertEquals("set-1-1", w.lastDoneSet()?.id)
    }
}
```

- [ ] **Step 4: Escribir los tests del descanso** `data/workout/RestRulesTest.kt`

```kotlin
package com.fittrainer.data.workout

import com.fittrainer.testing.fakes.workout.T0
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RestRulesTest {

    private val running = Rest(endsAt = T0.plusSeconds(90), totalSeconds = 90, pausedRemainingMs = null)

    @Test fun `arranca con los segundos del ejercicio y con 0 no hay descanso`() {
        assertEquals(running, startRest(90, T0))
        assertNull(startRest(0, T0))
    }

    @Test fun `lo que falta sale de la hora real y nunca es negativo`() {
        assertEquals(34_000L, running.remainingMs(T0.plusSeconds(56)))
        assertEquals(0L, running.remainingMs(T0.plusSeconds(200)))
        assertTrue(running.isOver(T0.plusSeconds(90)))
        assertFalse(running.isOver(T0.plusSeconds(89)))
    }

    @Test fun `mas 15 extiende el fin y agranda el total si hace falta`() {
        val r = running.adjust(15, T0.plusSeconds(10))!!
        assertEquals(T0.plusSeconds(105), r.endsAt)
        assertEquals(95, r.totalSeconds)
    }

    @Test fun `menos 15 nunca baja de 0 y llegar a 0 termina el descanso`() {
        assertEquals(T0.plusSeconds(75), running.adjust(-15, T0)!!.endsAt)
        assertNull(running.adjust(-15, T0.plusSeconds(80)))
    }

    @Test fun `pausar congela lo que falta y seguir lo retoma desde ahora`() {
        val paused = running.togglePause(T0.plusSeconds(30))
        assertTrue(paused.isPaused)
        assertEquals(60_000L, paused.remainingMs(T0.plusSeconds(500)))
        val resumed = paused.togglePause(T0.plusSeconds(500))
        assertEquals(T0.plusSeconds(560), resumed.endsAt)
        assertFalse(resumed.isPaused)
    }

    @Test fun `ajustar en pausa cambia lo que falta sin arrancar`() {
        val paused = running.togglePause(T0).adjust(15, T0.plusSeconds(999))!!
        assertEquals(105_000L, paused.pausedRemainingMs)
        assertNull(paused.endsAt)
    }

    @Test fun `el descanso termino solo si el fin anterior ya paso y cambio`() {
        val end = T0.plusSeconds(90)
        assertTrue(restJustEnded(end, null, T0.plusSeconds(90)))
        assertFalse(restJustEnded(end, null, T0.plusSeconds(40)))
        assertFalse(restJustEnded(end, end, T0.plusSeconds(95)))
        assertFalse(restJustEnded(null, end, T0))
    }
}
```

- [ ] **Step 5: Correr los tests y ver que fallan**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.*"`
Expected: FAIL de compilación ("Unresolved reference: nextAfter", "startRest", …).

- [ ] **Step 6: Escribir las reglas** `data/workout/WorkoutRules.kt`

```kotlin
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
    WorkoutSummary(sets.size, Duration.between(startedAt, now).toMinutes())

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
```

- [ ] **Step 7: Correr los tests y ver que pasan**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.*"`
Expected: PASS (19 tests).

- [ ] **Step 8: Cerrar la tarea**

Run: `./gradlew checkFileLength testDebugUnitTest`
Expected: BUILD SUCCESSFUL. No commitear.

---

### Task 2: Room v4 (entidades, DAO, migración)

**Files:**
- Create: `main/java/com/fittrainer/data/db/workout/WorkoutEntities.kt`
- Create: `main/java/com/fittrainer/data/db/workout/WorkoutDao.kt`
- Modify: `main/java/com/fittrainer/data/db/FitTrainerDatabase.kt` (v4, entidades, `AutoMigration(3, 4)`, `workoutDao()`)
- Modify: `main/java/com/fittrainer/di/DatabaseModule.kt` (provider)
- Create (generado): `mobile/app/schemas/com.fittrainer.data.db.FitTrainerDatabase/4.json`
- Test: `androidTest/java/com/fittrainer/data/db/workout/WorkoutDaoTest.kt`; Modify: `androidTest/java/com/fittrainer/data/db/FitTrainerDatabaseMigrationTest.kt`

**Interfaces:**
- Consumes: nada de la Task 1 (Room no conoce el dominio).
- Produces:
  - **entidades:** `WorkoutSessionEntity`, `WorkoutExerciseEntity`, `WorkoutSetEntity` y `WorkoutWithDetails` (`session`, `exercises`, `sets`);
  - **constantes:** `STATUS_ACTIVE = "ACTIVE"`, `STATUS_FINISHED = "FINISHED"`, `SYNC_PENDING = "PENDING"`;
  - **`WorkoutDao` (abstract class):**
    - lectura: `observeActive(ownerId): Flow<WorkoutWithDetails?>`, `getActive(ownerId): WorkoutWithDetails?`, `lastSetFor(ownerId, exerciseId): WorkoutSetEntity?`;
    - escritura: `insertSession`, `insertExercises`, `updateSession`, `updateExercise`, `upsertSet`, `deleteSession(id)`;
    - transacciones: `start(session, exercises)` y `saveSet(set, session)`.

- [ ] **Step 1: Escribir las entidades** `data/db/workout/WorkoutEntities.kt`

```kotlin
package com.fittrainer.data.db.workout

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation

const val STATUS_ACTIVE = "ACTIVE"
const val STATUS_FINISHED = "FINISHED"
/** La tarjeta 11 la sube y la marca como subida. */
const val SYNC_PENDING = "PENDING"

/**
 * Sesión de entrenamiento. Mismos datos que `sessions` del backend más el cursor (dónde está el
 * alumno) para retomar. No es un caché: no se borra en el logout (spec §4).
 */
@Entity(tableName = "workout_sessions", indices = [Index(value = ["ownerId", "status"])])
data class WorkoutSessionEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val routineId: String?,
    val routineName: String,
    val startedAt: Long,
    val finishedAt: Long?,
    val status: String,
    val syncState: String,
    val currentPosition: Int,
    val currentSet: Int,
    val restEndsAt: Long?,
    val restTotalSeconds: Int?,
    val restPausedRemainingMs: Long?,
)

/** Copia del plan al empezar: que Hoy refresque la rutina no cambia la sesión. */
@Entity(
    tableName = "workout_exercises",
    primaryKeys = ["sessionId", "position"],
    foreignKeys = [
        ForeignKey(
            entity = WorkoutSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
data class WorkoutExerciseEntity(
    val sessionId: String,
    val position: Int,
    val routineExerciseId: String?,
    val exerciseId: String,
    val originalExerciseId: String?,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val description: String?,
    val videoUrl: String?,
    val sets: Int?,
    val reps: Int?,
    val restSeconds: Int?,
    val suggestedKg: Double?,
)

/** Serie confirmada. Mismos datos que `session_sets` del backend; executedAt es el momento real. */
@Entity(
    tableName = "workout_sets",
    foreignKeys = [
        ForeignKey(
            entity = WorkoutSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["sessionId", "position", "setNumber"], unique = true), Index("exerciseId")],
)
data class WorkoutSetEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val position: Int,
    val exerciseId: String,
    val originalExerciseId: String?,
    val routineExerciseId: String?,
    val setNumber: Int,
    val actualKg: Double,
    val actualReps: Int,
    val executedAt: Long,
)

data class WorkoutWithDetails(
    @Embedded val session: WorkoutSessionEntity,
    @Relation(parentColumn = "id", entityColumn = "sessionId")
    val exercises: List<WorkoutExerciseEntity>,
    @Relation(parentColumn = "id", entityColumn = "sessionId")
    val sets: List<WorkoutSetEntity>,
)
```

- [ ] **Step 2: Escribir el DAO** `data/db/workout/WorkoutDao.kt`

```kotlin
package com.fittrainer.data.db.workout

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Sesiones de entrenamiento. Todo se filtra por dueño: otro alumno en el mismo celular no ve nada ajeno. */
@Dao
abstract class WorkoutDao {

    @Transaction
    @Query("SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = 'ACTIVE' LIMIT 1")
    abstract fun observeActive(ownerId: String): Flow<WorkoutWithDetails?>

    @Transaction
    @Query("SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = 'ACTIVE' LIMIT 1")
    abstract suspend fun getActive(ownerId: String): WorkoutWithDetails?

    /** La última serie del ejercicio en una sesión terminada del mismo alumno ("la última vez"). */
    @Query(
        "SELECT s.* FROM workout_sets s INNER JOIN workout_sessions w ON w.id = s.sessionId " +
            "WHERE w.ownerId = :ownerId AND w.status = 'FINISHED' AND s.exerciseId = :exerciseId " +
            "ORDER BY s.executedAt DESC LIMIT 1"
    )
    abstract suspend fun lastSetFor(ownerId: String, exerciseId: String): WorkoutSetEntity?

    @Insert
    abstract suspend fun insertSession(session: WorkoutSessionEntity)

    @Insert
    abstract suspend fun insertExercises(exercises: List<WorkoutExerciseEntity>)

    @Update
    abstract suspend fun updateSession(session: WorkoutSessionEntity)

    @Update
    abstract suspend fun updateExercise(exercise: WorkoutExerciseEntity)

    @Upsert
    abstract suspend fun upsertSet(set: WorkoutSetEntity)

    /** Borra en cascada la copia del plan y las series. */
    @Query("DELETE FROM workout_sessions WHERE id = :id")
    abstract suspend fun deleteSession(id: String)

    /** Sesión y copia del plan juntas. Falla si el alumno ya tiene una sesión abierta. */
    @Transaction
    open suspend fun start(session: WorkoutSessionEntity, exercises: List<WorkoutExerciseEntity>) {
        check(getActive(session.ownerId) == null) { "Ya hay una sesión abierta" }
        insertSession(session)
        insertExercises(exercises)
    }

    /** Serie y cursor juntos: nunca queda una serie guardada sin avanzar, ni un cursor sin su serie. */
    @Transaction
    open suspend fun saveSet(set: WorkoutSetEntity, session: WorkoutSessionEntity) {
        upsertSet(set)
        updateSession(session)
    }
}
```

- [ ] **Step 3: Subir la base a v4** — en `FitTrainerDatabase.kt`:
  - agregar los imports `com.fittrainer.data.db.workout.WorkoutDao`, `WorkoutExerciseEntity`, `WorkoutSessionEntity` y `WorkoutSetEntity`;
  - sumar las tres entidades al final de `entities`;
  - poner `version = 4`;
  - poner `autoMigrations = [AutoMigration(from = 1, to = 2), AutoMigration(from = 2, to = 3), AutoMigration(from = 3, to = 4)]`;
  - agregar `abstract fun workoutDao(): WorkoutDao`.

  En `DatabaseModule.kt`, agregar al lado de `provideLibraryDao`:

```kotlin
    @Provides
    fun provideWorkoutDao(db: FitTrainerDatabase): WorkoutDao = db.workoutDao()
```

(con `import com.fittrainer.data.db.workout.WorkoutDao`).

- [ ] **Step 4: Generar el schema**

Run: `./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL. Aparece `app/schemas/com.fittrainer.data.db.FitTrainerDatabase/4.json` con las tablas `workout_sessions`, `workout_exercises` y `workout_sets`.

- [ ] **Step 5: Escribir el test del DAO** `androidTest/.../data/db/workout/WorkoutDaoTest.kt`

```kotlin
package com.fittrainer.data.db.workout

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WorkoutDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: WorkoutDao

    private fun session(id: String, owner: String = "u1", status: String = STATUS_ACTIVE) = WorkoutSessionEntity(
        id, owner, "rt-1", "Push", 1_000L, null, status, SYNC_PENDING, 0, 1, null, null, null,
    )

    private fun exercise(sessionId: String, position: Int = 0) = WorkoutExerciseEntity(
        sessionId, position, "re-$position", "ex-$position", null, "Press", "chest", null, null, null, 4, 8, 90, 40.0,
    )

    private fun set(id: String, sessionId: String, setNumber: Int = 1, kg: Double = 40.0, at: Long = 2_000L) =
        WorkoutSetEntity(id, sessionId, 0, "ex-0", null, "re-0", setNumber, kg, 8, at)

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
        dao = db.workoutDao()
    }

    @After fun tearDown() = db.close()

    @Test fun startGuardaLaSesionConSuPlanYSeObservaSoloParaSuDuenio() = runTest {
        dao.start(session("w1"), listOf(exercise("w1", 0), exercise("w1", 1)))

        assertEquals(2, dao.observeActive("u1").first()?.exercises?.size)
        assertNull(dao.observeActive("u2").first())
    }

    @Test fun startFallaSiYaHayUnaSesionAbierta() = runTest {
        dao.start(session("w1"), listOf(exercise("w1")))

        val error = runCatching { dao.start(session("w2"), listOf(exercise("w2"))) }.exceptionOrNull()

        assertTrue(error is IllegalStateException)
        assertEquals("w1", dao.getActive("u1")?.session?.id)
    }

    @Test fun saveSetConElMismoIdCorrigeSinDuplicar() = runTest {
        dao.start(session("w1"), listOf(exercise("w1")))
        dao.saveSet(set("s1", "w1"), session("w1").copy(currentSet = 2))
        dao.upsertSet(set("s1", "w1", kg = 42.5))

        val active = dao.getActive("u1")!!
        assertEquals(listOf(42.5), active.sets.map { it.actualKg })
        assertEquals(2, active.session.currentSet)
    }

    @Test fun lastSetForIgnoraSesionesAbiertasYDeOtroDuenio() = runTest {
        dao.insertSession(session("old", status = STATUS_FINISHED))
        dao.upsertSet(set("a", "old", kg = 50.0, at = 5_000L))
        dao.insertSession(session("other", owner = "u2", status = STATUS_FINISHED))
        dao.upsertSet(set("b", "other", kg = 99.0, at = 9_000L))
        dao.start(session("now"), listOf(exercise("now")))
        dao.upsertSet(set("c", "now", kg = 70.0, at = 8_000L))

        assertEquals(50.0, dao.lastSetFor("u1", "ex-0")?.actualKg)
    }

    @Test fun deleteSessionBorraEnCascada() = runTest {
        dao.start(session("w1"), listOf(exercise("w1")))
        dao.upsertSet(set("s1", "w1"))

        dao.deleteSession("w1")

        assertNull(dao.getActive("u1"))
        assertNull(dao.lastSetFor("u1", "ex-0"))
        db.openHelper.readableDatabase.query("SELECT COUNT(*) FROM workout_sets").use {
            it.moveToFirst()
            assertEquals(0, it.getInt(0))
        }
    }
}
```

- [ ] **Step 6: Sumar el caso 3→4** en `FitTrainerDatabaseMigrationTest.kt`, debajo de `migra2a3ConservandoLosDatos`:

```kotlin
    @Test fun migra3a4ConservandoLosDatos() {
        helper.createDatabase(DB, 3).apply {
            execSQL("INSERT INTO routines (id, name, goal, days, createdAt) VALUES ('rt-1', 'Rutina', NULL, 'monday', 1)")
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 4, true)

        db.query("SELECT name FROM routines WHERE id = 'rt-1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Rutina", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM workout_sessions").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }
```

- [ ] **Step 7: Correr los tests instrumentados** (con el emulador encendido)

Run: `./gradlew connectedDebugAndroidTest`
Expected: PASS. Son los 26 de antes más 6 nuevos (5 del DAO y 1 de migración).

- [ ] **Step 8: Cerrar la tarea**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL. No commitear. El `4.json` se commitea junto con el código.

---

### Task 3: Repositorio

**Files:**
- Create: `main/java/com/fittrainer/data/workout/IdGenerator.kt`
- Create: `main/java/com/fittrainer/data/workout/WorkoutMapper.kt`
- Create: `main/java/com/fittrainer/data/workout/WorkoutRepository.kt`
- Create: `main/java/com/fittrainer/di/WorkoutModule.kt`
- Create: `test/java/com/fittrainer/testing/fakes/workout/FakeWorkoutDao.kt`
- Test: `test/java/com/fittrainer/data/workout/WorkoutRepositoryTest.kt`, `test/java/com/fittrainer/data/workout/WorkoutRepositorySetsTest.kt`

**Interfaces:**
- Consumes:
  - de la Task 1: el dominio y las reglas;
  - de la Task 2: `WorkoutDao` y las entidades;
  - código existente: `com.fittrainer.data.routine.Routine` y `RoutineExercise`, y `com.fittrainer.data.library.LibraryExercise`.
- Produces:
  - `fun interface IdGenerator { fun newId(): String }`;
  - `enum class SaveOutcome { Corrected, Advanced, AllDone }`;
  - `WorkoutRepository` (singleton), todas sus operaciones por `ownerId`:
    - lectura: `observeActive(ownerId): Flow<Workout?>`, `lastSetFor(ownerId, exerciseId): WorkoutSet?`;
    - empezar: `start(ownerId, routine: Routine): String`;
    - series: `saveSet(ownerId, position, setNumber, load: Load): SaveOutcome?`, `moveTo(ownerId, position)`;
    - descanso: `adjustRest(ownerId, deltaSeconds)`, `toggleRestPause(ownerId)`, `skipRest(ownerId)`, `endRestIfOver(ownerId)`;
    - reemplazo: `replaceExercise(ownerId, position, replacement: LibraryExercise): Boolean`;
    - cierre: `finish(ownerId): WorkoutSummary?` (null si no había sesión o si se descartó por no tener series) y `discard(ownerId)`;
  - `FakeWorkoutDao` con `state` y `failWrites`.

- [ ] **Step 1: Escribir `IdGenerator.kt` y el módulo DI**

```kotlin
package com.fittrainer.data.workout

import java.util.UUID
import javax.inject.Inject

/** Ids generados en el celular (offline-first): reintentar el sync no duplica. */
fun interface IdGenerator {
    fun newId(): String
}

class UuidGenerator @Inject constructor() : IdGenerator {
    override fun newId(): String = UUID.randomUUID().toString()
}
```

`di/WorkoutModule.kt`:

```kotlin
package com.fittrainer.di

import com.fittrainer.data.workout.IdGenerator
import com.fittrainer.data.workout.UuidGenerator
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/** Las sesiones NO se registran como UserDataCleaner: no son caché, son entrenamientos sin subir (spec §4). */
@Module
@InstallIn(SingletonComponent::class)
abstract class WorkoutModule {

    @Binds
    abstract fun bindIdGenerator(impl: UuidGenerator): IdGenerator
}
```

- [ ] **Step 2: Escribir el mapper** `data/workout/WorkoutMapper.kt`

```kotlin
package com.fittrainer.data.workout

import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.WorkoutExerciseEntity
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.db.workout.WorkoutSetEntity
import com.fittrainer.data.db.workout.WorkoutWithDetails
import com.fittrainer.data.routine.RoutineExercise
import java.time.Instant

fun WorkoutWithDetails.toDomain(): Workout = Workout(
    id = session.id,
    ownerId = session.ownerId,
    routineId = session.routineId,
    routineName = session.routineName,
    startedAt = Instant.ofEpochMilli(session.startedAt),
    exercises = exercises.sortedBy { it.position }.map { it.toDomain() },
    sets = sets.sortedWith(compareBy({ it.position }, { it.setNumber })).map { it.toDomain() },
    cursor = Cursor(session.currentPosition, session.currentSet),
    rest = session.restTotalSeconds?.let { total ->
        Rest(session.restEndsAt?.let(Instant::ofEpochMilli), total, session.restPausedRemainingMs)
    },
)

fun WorkoutExerciseEntity.toDomain() = WorkoutExercise(
    position, routineExerciseId, exerciseId, originalExerciseId, name, muscleGroup, equipment, description,
    videoUrl, sets, reps, restSeconds, suggestedKg,
)

fun WorkoutSetEntity.toDomain() = WorkoutSet(
    id, position, exerciseId, originalExerciseId, routineExerciseId, setNumber, actualKg, actualReps,
    Instant.ofEpochMilli(executedAt),
)

/** Fila de la sesión con su cursor y su descanso. Por defecto, abierta y sin terminar. */
fun Workout.toSessionEntity(status: String = STATUS_ACTIVE, finishedAt: Long? = null) = WorkoutSessionEntity(
    id = id,
    ownerId = ownerId,
    routineId = routineId,
    routineName = routineName,
    startedAt = startedAt.toEpochMilli(),
    finishedAt = finishedAt,
    status = status,
    syncState = SYNC_PENDING,
    currentPosition = cursor.position,
    currentSet = cursor.setNumber,
    restEndsAt = rest?.endsAt?.toEpochMilli(),
    restTotalSeconds = rest?.totalSeconds,
    restPausedRemainingMs = rest?.pausedRemainingMs,
)

fun WorkoutExercise.toEntity(sessionId: String) = WorkoutExerciseEntity(
    sessionId, position, routineExerciseId, exerciseId, originalExerciseId, name, muscleGroup, equipment,
    description, videoUrl, sets, reps, restSeconds, suggestedKg,
)

fun WorkoutSet.toEntity(sessionId: String) = WorkoutSetEntity(
    id, sessionId, position, exerciseId, originalExerciseId, routineExerciseId, setNumber, kg, reps,
    executedAt.toEpochMilli(),
)

/** Copia del plan al empezar (la rutina no tiene descripción: la trae el reemplazo, si hay). */
fun RoutineExercise.toWorkoutExercise(position: Int) = WorkoutExercise(
    position = position,
    routineExerciseId = id,
    exerciseId = exerciseId,
    originalExerciseId = null,
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
    description = null,
    videoUrl = videoUrl,
    sets = sets,
    reps = reps,
    restSeconds = restSeconds,
    suggestedKg = suggestedKg,
)
```

- [ ] **Step 3: Escribir el DAO falso** `testing/fakes/workout/FakeWorkoutDao.kt`

```kotlin
package com.fittrainer.testing.fakes.workout

import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.db.workout.WorkoutExerciseEntity
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.db.workout.WorkoutSetEntity
import com.fittrainer.data.db.workout.WorkoutWithDetails
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** DAO en memoria. start y saveSet son los del WorkoutDao real (llaman a estas primitivas). */
class FakeWorkoutDao : WorkoutDao() {

    data class State(
        val sessions: Map<String, WorkoutSessionEntity> = emptyMap(),
        val exercises: List<WorkoutExerciseEntity> = emptyList(),
        val sets: List<WorkoutSetEntity> = emptyList(),
    )

    val state = MutableStateFlow(State())

    /** Simula que Room falla al escribir (spec §6). */
    var failWrites = false

    private fun activeOf(st: State, ownerId: String): WorkoutWithDetails? =
        st.sessions.values.firstOrNull { it.ownerId == ownerId && it.status == STATUS_ACTIVE }?.let { s ->
            WorkoutWithDetails(s, st.exercises.filter { it.sessionId == s.id }, st.sets.filter { it.sessionId == s.id })
        }

    override fun observeActive(ownerId: String): Flow<WorkoutWithDetails?> =
        state.map { activeOf(it, ownerId) }.distinctUntilChanged()

    override suspend fun getActive(ownerId: String) = activeOf(state.value, ownerId)

    override suspend fun lastSetFor(ownerId: String, exerciseId: String): WorkoutSetEntity? {
        val st = state.value
        return st.sets.filter { set ->
            val session = st.sessions[set.sessionId]
            set.exerciseId == exerciseId && session?.ownerId == ownerId && session.status == STATUS_FINISHED
        }.maxByOrNull { it.executedAt }
    }

    override suspend fun insertSession(session: WorkoutSessionEntity) =
        write { it.copy(sessions = it.sessions + (session.id to session)) }

    override suspend fun insertExercises(exercises: List<WorkoutExerciseEntity>) =
        write { it.copy(exercises = it.exercises + exercises) }

    override suspend fun updateSession(session: WorkoutSessionEntity) =
        write { it.copy(sessions = it.sessions + (session.id to session)) }

    override suspend fun updateExercise(exercise: WorkoutExerciseEntity) = write { st ->
        st.copy(exercises = st.exercises.map {
            if (it.sessionId == exercise.sessionId && it.position == exercise.position) exercise else it
        })
    }

    override suspend fun upsertSet(set: WorkoutSetEntity) =
        write { st -> st.copy(sets = st.sets.filterNot { it.id == set.id } + set) }

    override suspend fun deleteSession(id: String) = write { st ->
        st.copy(
            sessions = st.sessions - id,
            exercises = st.exercises.filterNot { it.sessionId == id },
            sets = st.sets.filterNot { it.sessionId == id },
        )
    }

    private fun write(change: (State) -> State) {
        check(!failWrites) { "Room falló" }
        state.update(change)
    }
}
```

- [ ] **Step 4: Escribir los tests que fallan** `data/workout/WorkoutRepositoryTest.kt` (empezar, terminar, descartar y reemplazar)

```kotlin
package com.fittrainer.data.workout

import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkoutRepositoryTest {

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }

    private fun routineExercise(i: Int) = RoutineExercise(
        "re-$i", "ex-$i", "Ejercicio $i", "chest", null, null, 2, 8, 60, 40.0, null, null,
    )

    private val routine = Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, listOf(routineExercise(0), routineExercise(1)))

    @Test fun `empezar copia el plan y deja el cursor en la primera serie`() = runTest {
        val id = repo.start("u1", routine)

        val w = repo.observeActive("u1").first()!!
        assertEquals(id, w.id)
        assertEquals(listOf("ex-0", "ex-1"), w.exercises.map { it.exerciseId })
        assertEquals(Cursor(0, 1), w.cursor)
        assertEquals(T0, w.startedAt)
    }

    @Test fun `empezar con una sesion abierta devuelve esa y no crea otra`() = runTest {
        val first = repo.start("u1", routine)

        assertEquals(first, repo.start("u1", routine))
        assertEquals(1, dao.state.value.sessions.size)
    }

    @Test fun `otro alumno no ve la sesion`() = runTest {
        repo.start("u1", routine)

        assertNull(repo.observeActive("u2").first())
    }

    @Test fun `terminar marca la sesion y devuelve el resumen`() = runTest {
        repo.start("u1", routine)
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        clock.millis += 52 * 60_000L

        val summary = repo.finish("u1")

        assertEquals(WorkoutSummary(1, 52), summary)
        assertNull(repo.observeActive("u1").first())
        assertEquals(STATUS_FINISHED, dao.state.value.sessions.values.single().status)
    }

    @Test fun `terminar sin series descarta la sesion`() = runTest {
        repo.start("u1", routine)

        assertNull(repo.finish("u1"))
        assertTrue(dao.state.value.sessions.isEmpty())
    }

    @Test fun `descartar borra la sesion con su plan y sus series`() = runTest {
        repo.start("u1", routine)
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        repo.discard("u1")

        assertEquals(FakeWorkoutDao.State(), dao.state.value)
    }

    @Test fun `reemplazar cambia la copia del plan y conserva series reps y descanso`() = runTest {
        repo.start("u1", routine)
        val bench = LibraryExercise("lib-9", "Press con mancuernas", "chest", "dumbbell", "Bajá lento", "https://v")

        assertTrue(repo.replaceExercise("u1", 0, bench))

        val e = repo.observeActive("u1").first()!!.exercises.first()
        assertEquals("lib-9", e.exerciseId)
        assertEquals("ex-0", e.originalExerciseId)
        assertEquals("Press con mancuernas", e.name)
        assertEquals("Bajá lento", e.description)
        assertEquals(2, e.sets)
        assertEquals(60, e.restSeconds)
    }

    @Test fun `reemplazar dos veces conserva el original y volver lo limpia`() = runTest {
        repo.start("u1", routine)
        repo.replaceExercise("u1", 0, LibraryExercise("lib-1", "A", "chest", null, null, null))
        repo.replaceExercise("u1", 0, LibraryExercise("lib-2", "B", "chest", null, null, null))
        assertEquals("ex-0", repo.observeActive("u1").first()!!.exercises.first().originalExerciseId)

        repo.replaceExercise("u1", 0, LibraryExercise("ex-0", "Ejercicio 0", "chest", null, null, null))

        assertNull(repo.observeActive("u1").first()!!.exercises.first().originalExerciseId)
    }

    @Test fun `no se reemplaza un ejercicio con series hechas`() = runTest {
        repo.start("u1", routine)
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        assertFalse(repo.replaceExercise("u1", 0, LibraryExercise("lib-1", "A", "chest", null, null, null)))
    }
}
```

- [ ] **Step 5: Escribir los tests de series y descanso** `data/workout/WorkoutRepositorySetsTest.kt`

```kotlin
package com.fittrainer.data.workout

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WorkoutRepositorySetsTest {

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }

    private fun ex(i: Int, rest: Int? = 60) =
        RoutineExercise("re-$i", "ex-$i", "E$i", "chest", null, null, 2, 8, rest, 40.0, null, null)

    private suspend fun active() = repo.observeActive("u1").first()!!

    private suspend fun startWith(vararg exercises: RoutineExercise) =
        repo.start("u1", Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, exercises.toList()))

    @Test fun `confirmar guarda la serie con hora real, avanza y arranca el descanso`() = runTest {
        startWith(ex(0), ex(1))
        clock.millis += 5_000

        assertEquals(SaveOutcome.Advanced, repo.saveSet("u1", 0, 1, Load(42.5, 9)))

        val w = active()
        val set = w.sets.single()
        assertEquals(Load(42.5, 9), Load(set.kg, set.reps))
        assertEquals(T0.plusSeconds(5), set.executedAt)
        assertEquals("re-0", set.routineExerciseId)
        assertEquals(Cursor(0, 2), w.cursor)
        assertEquals(T0.plusSeconds(65), w.rest?.endsAt)
    }

    @Test fun `confirmar dos veces la misma serie no la duplica`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        assertEquals(SaveOutcome.Corrected, repo.saveSet("u1", 0, 1, Load(40.0, 8)))

        val w = active()
        assertEquals(1, w.sets.size)
        assertEquals(Cursor(0, 2), w.cursor)
    }

    @Test fun `corregir conserva id y hora y no toca cursor ni descanso`() = runTest {
        startWith(ex(0), ex(1))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        val before = active()
        clock.millis += 30_000

        repo.saveSet("u1", 0, 1, Load(37.5, 10))

        val after = active()
        assertEquals(before.sets.single().id, after.sets.single().id)
        assertEquals(before.sets.single().executedAt, after.sets.single().executedAt)
        assertEquals(37.5, after.sets.single().kg, 0.0)
        assertEquals(before.cursor, after.cursor)
        assertEquals(before.rest, after.rest)
    }

    @Test fun `la ultima serie devuelve AllDone y no arranca descanso`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        assertEquals(SaveOutcome.AllDone, repo.saveSet("u1", 0, 2, Load(40.0, 8)))
        assertNull(active().rest)
    }

    @Test fun `un ejercicio sin descanso pasa directo a la serie`() = runTest {
        startWith(ex(0, rest = 0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        assertNull(active().rest)
    }

    @Test fun `ir a un ejercicio pone el cursor en su primera serie pendiente`() = runTest {
        startWith(ex(0), ex(1))
        repo.moveTo("u1", 1)
        assertEquals(Cursor(1, 1), active().cursor)
    }

    @Test fun `mas 15, pausa y saltar cambian el descanso`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        repo.adjustRest("u1", 15)
        assertEquals(T0.plusSeconds(75), active().rest?.endsAt)
        repo.toggleRestPause("u1")
        assertEquals(75_000L, active().rest?.pausedRemainingMs)
        repo.skipRest("u1")
        assertNull(active().rest)
    }

    @Test fun `endRestIfOver solo termina el descanso vencido`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))

        repo.endRestIfOver("u1")
        assertEquals(T0.plusSeconds(60), active().rest?.endsAt)
        clock.millis += 60_000
        repo.endRestIfOver("u1")
        assertNull(active().rest)
    }

    @Test fun `ajustar un descanso ya terminado no lo revive`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        clock.millis += 60_000
        repo.endRestIfOver("u1")

        repo.adjustRest("u1", 15)

        assertNull(active().rest)
    }

    @Test fun `la ultima vez sale de sesiones terminadas`() = runTest {
        startWith(ex(0))
        repo.saveSet("u1", 0, 1, Load(55.0, 6))
        repo.finish("u1")

        assertEquals(55.0, repo.lastSetFor("u1", "ex-0")?.kg)
        assertNull(repo.lastSetFor("u2", "ex-0"))
    }
}
```

- [ ] **Step 6: Correr los tests y ver que fallan**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.WorkoutRepository*"`
Expected: FAIL de compilación ("Unresolved reference: WorkoutRepository").

- [ ] **Step 7: Escribir el repositorio** `data/workout/WorkoutRepository.kt`

```kotlin
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
     * tocar cursor ni descanso. Si es nueva, avanza el cursor y arranca el descanso del ejercicio.
     */
    suspend fun saveSet(ownerId: String, position: Int, setNumber: Int, load: Load): SaveOutcome? =
        withActive(ownerId) { w ->
            w.setAt(position, setNumber)?.let { old ->
                dao.upsertSet(old.copy(kg = load.kg, reps = load.reps).toEntity(w.id))
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
```

- [ ] **Step 8: Correr los tests y ver que pasan**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.*"`
Expected: PASS (todos los de las Tasks 1 y 3).

- [ ] **Step 9: Cerrar la tarea**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL. No commitear.

---

### Task 4: Estado de la pantalla y ViewModel

**Files:**
- Create: `main/java/com/fittrainer/ui/workout/WorkoutTexts.kt`
- Create: `main/java/com/fittrainer/ui/workout/WorkoutUiState.kt`
- Create: `main/java/com/fittrainer/ui/workout/WorkoutViewModel.kt`
- Test: `test/java/com/fittrainer/ui/workout/WorkoutTextsTest.kt`, `test/java/com/fittrainer/ui/workout/WorkoutViewModelTest.kt`

**Interfaces:**
- Consumes:
  - de la Task 3: `WorkoutRepository` y `SaveOutcome`;
  - código existente: `LibraryRepository.observeCache(ownerId): Flow<LibraryCache>`, `SessionRepository.session`, `ConnectivityObserver.isOnline`, y de los tests `FakeStudentSession`, `FakeConnectivityObserver`, `FakeExerciseApi`, `FakeLibraryDao`, `MutableClock` y `MainDispatcherRule`.
- Produces:
  - `WorkoutUiState` con `workout`, `load`, `editingSet`, `summary`, `error`, `isOffline` y `library`, y las derivadas `exercise`, `shownSet`, `isCorrecting`, `isResting`, `closed`;
  - las acciones de `WorkoutViewModel`:
    - serie: `onAdjustKg(delta: Double)`, `onManualEntry(kg: Double, reps: Int)`, `onSelectSet(setNumber)`, `onSelectExercise(position)`, `onConfirm()`;
    - descanso: `onRestAdjust(deltaSeconds)`, `onRestTogglePause()`, `onRestSkip()`, `onRestElapsed()`;
    - otras: `onReplace(LibraryExercise)`, `onFinish()`, `onDiscard()`, `dismissError()`, `now(): Instant`;
  - textos en `WorkoutTexts.kt`:
    - constantes: `CTA_REST`, `CTA_FINISH`, `CTA_CORRECT`, `SAVE_FAILED`, `NO_NOTIFICATIONS`, `REPLACE_LOCKED`, `LIBRARY_NEVER_SYNCED`;
    - funciones: `formatClock(ms)`, `formatElapsed(from, now)`, `kgNumber(kg)`, `setTabLabel(set)`, `suggestedChip(exercise)`, `ctaLabel(state)`, `missingSetsMessage(n)`, `summaryText(summary)`, `exerciseCounter(workout)`, `loadLine(load)`.

- [ ] **Step 1: Escribir los tests de los textos** `ui/workout/WorkoutTextsTest.kt`

```kotlin
package com.fittrainer.ui.workout

import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.testing.fakes.workout.T0
import com.fittrainer.testing.fakes.workout.doneSet
import com.fittrainer.testing.fakes.workout.exercise
import com.fittrainer.testing.fakes.workout.workout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WorkoutTextsTest {

    @Test fun `reloj y cronometro`() {
        assertEquals("1:30", formatClock(90_000))
        assertEquals("0:05", formatClock(4_001))
        assertEquals("22:14", formatElapsed(T0, T0.plusSeconds(22 * 60 + 14)))
        assertEquals("1:02:03", formatElapsed(T0, T0.plusSeconds(3_723)))
    }

    @Test fun `numeros de peso con coma y tabs hechas`() {
        assertEquals("65", kgNumber(65.0))
        assertEquals("62,5", kgNumber(62.5))
        assertEquals("65·10", setTabLabel(doneSet(0, 1, kg = 65.0, reps = 10)))
        assertEquals("70kg × 8 reps", loadLine(Load(70.0, 8)))
    }

    @Test fun `chip de sugerido segun lo que trae la rutina`() {
        assertEquals("SUGERIDO · 70KG × 8", suggestedChip(exercise(0, suggestedKg = 70.0, reps = 8)))
        assertEquals("SUGERIDO · 8 REPS", suggestedChip(exercise(0, suggestedKg = null, reps = 8)))
        assertNull(suggestedChip(exercise(0, suggestedKg = null, reps = null)))
    }

    @Test fun `el CTA cambia en la ultima serie y al corregir`() {
        val first = WorkoutUiState(workout = workout())
        assertEquals(CTA_REST, ctaLabel(first))
        val last = workout(sets = listOf(doneSet(0, 1), doneSet(0, 2), doneSet(1, 1)), cursor = Cursor(1, 2))
        assertEquals(CTA_FINISH, ctaLabel(WorkoutUiState(workout = last)))
        assertEquals(CTA_CORRECT, ctaLabel(WorkoutUiState(workout = last, editingSet = 1)))
    }

    @Test fun `mensajes de cierre`() {
        assertEquals("Te falta 1 serie, ¿terminar igual?", missingSetsMessage(1))
        assertEquals("Te faltan 6 series, ¿terminar igual?", missingSetsMessage(6))
        assertEquals("Sesión terminada · 18 series · 52 min", summaryText(WorkoutSummary(18, 52)))
        assertEquals("EJERCICIO 2 / 2", exerciseCounter(workout(cursor = Cursor(1, 1))))
    }
}
```

- [ ] **Step 2: Escribir los textos** `ui/workout/WorkoutTexts.kt`

```kotlin
package com.fittrainer.ui.workout

import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.data.workout.WorkoutSet
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.data.workout.isLastPending
import java.time.Duration
import java.time.Instant

const val CTA_REST = "Serie completa → descanso"
const val CTA_FINISH = "Serie completa → terminar"
const val CTA_CORRECT = "Guardar corrección"
const val SAVE_FAILED = "No pudimos guardar la serie. Probá de nuevo"
const val NO_NOTIFICATIONS = "Sin notificaciones no vas a escuchar el fin del descanso con el celular bloqueado"
const val REPLACE_LOCKED = "Ya registraste series de este ejercicio"
const val LIBRARY_NEVER_SYNCED = "Conectate una vez para bajar la biblioteca"

/** 90_000 → "1:30". Redondea para arriba: 0:01 hasta que de verdad llega a 0. */
fun formatClock(ms: Long): String {
    val total = (ms + 999) / 1_000
    return "%d:%02d".format(total / 60, total % 60)
}

/** Cronómetro de la sesión: "22:14" o "1:02:03". */
fun formatElapsed(from: Instant, now: Instant): String {
    val s = Duration.between(from, now).seconds.coerceAtLeast(0)
    return if (s >= 3_600) "%d:%02d:%02d".format(s / 3_600, s % 3_600 / 60, s % 60) else "%d:%02d".format(s / 60, s % 60)
}

/** 65.0 → "65"; 62.5 → "62,5". */
fun kgNumber(kg: Double): String = if (kg % 1.0 == 0.0) kg.toInt().toString() else kg.toString().replace('.', ',')

fun setTabLabel(set: WorkoutSet): String = "${kgNumber(set.kg)}·${set.reps}"

fun loadLine(load: Load): String = "${kgNumber(load.kg)}kg × ${load.reps} reps"

/** Plan del PT; null si la rutina no trae ni peso ni reps. */
fun suggestedChip(e: WorkoutExercise): String? = when {
    e.suggestedKg != null && e.reps != null -> "SUGERIDO · ${kgNumber(e.suggestedKg)}KG × ${e.reps}"
    e.suggestedKg != null -> "SUGERIDO · ${kgNumber(e.suggestedKg)}KG"
    e.reps != null -> "SUGERIDO · ${e.reps} REPS"
    else -> null
}

fun ctaLabel(state: WorkoutUiState): String {
    val w = state.workout ?: return CTA_REST
    return when {
        state.isCorrecting -> CTA_CORRECT
        w.isLastPending(w.cursor) -> CTA_FINISH
        else -> CTA_REST
    }
}

fun missingSetsMessage(n: Int): String =
    if (n == 1) "Te falta 1 serie, ¿terminar igual?" else "Te faltan $n series, ¿terminar igual?"

fun summaryText(s: WorkoutSummary): String = "Sesión terminada · ${s.sets} series · ${s.minutes} min"

fun exerciseCounter(w: Workout): String = "EJERCICIO ${w.cursor.position + 1} / ${w.exercises.size}"
```

- [ ] **Step 3: Escribir el estado** `ui/workout/WorkoutUiState.kt`

```kotlin
package com.fittrainer.ui.workout

import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutExercise
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.data.workout.exercise
import com.fittrainer.data.workout.setAt

/**
 * workout: la sesión abierta leída de Room (null: no hay). load: lo que el alumno está ajustando de
 * la serie en pantalla. editingSet: una serie ya hecha que eligió corregir (null: la del cursor).
 */
data class WorkoutUiState(
    val loaded: Boolean = false,
    val workout: Workout? = null,
    val load: Load = Load(0.0, 0),
    val editingSet: Int? = null,
    /** Hay un cierre en curso: no cerrar la pantalla aunque la sesión ya no esté abierta. */
    val ending: Boolean = false,
    val summary: WorkoutSummary? = null,
    val error: String? = null,
    val isOffline: Boolean = false,
    val library: LibraryCache = LibraryCache(emptyList(), null),
) {
    val exercise: WorkoutExercise? get() = workout?.let { it.exercise(it.cursor.position) }

    /** Serie que muestran los números grandes y que guarda el CTA. */
    val shownSet: Int get() = editingSet ?: workout?.cursor?.setNumber ?: 1

    /** La serie en pantalla ya está registrada: el CTA la corrige. */
    val isCorrecting: Boolean get() = workout?.let { it.setAt(it.cursor.position, shownSet) != null } == true

    /** Se muestra el timer (salvo que el alumno esté corrigiendo una serie). */
    val isResting: Boolean get() = workout?.rest != null && editingSet == null

    /** No hay sesión (se descartó o se terminó sin series): la pantalla vuelve a Hoy. */
    val closed: Boolean get() = loaded && workout == null && summary == null && !ending
}
```

- [ ] **Step 4: Escribir los tests del ViewModel** `ui/workout/WorkoutViewModelTest.kt`

```kotlin
package com.fittrainer.ui.workout

import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class WorkoutViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val clock = MutableClock(T0.toEpochMilli())
    private var next = 0
    private val repo = WorkoutRepository(dao, clock) { "id-${next++}" }
    private val library = LibraryRepository(FakeExerciseApi(LibraryResponse(emptyList())), FakeLibraryDao(), clock)
    // lazy: el viewModelScope se crea con el Main que instala la regla.
    private val vm by lazy { WorkoutViewModel(repo, library, FakeStudentSession(), FakeConnectivityObserver(), clock) }

    private fun ex(i: Int) = RoutineExercise("re-$i", "ex-$i", "E$i", "chest", null, null, 2, 8, 60, 40.0, null, null)

    private suspend fun start(vararg exercises: RoutineExercise = arrayOf(ex(0), ex(1))) =
        repo.start("u1", Routine("rt-1", "Push", null, emptySet(), Instant.EPOCH, exercises.toList()))

    private fun TestScope.collect() =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    private val state get() = vm.uiState.value

    @Test fun `al abrir precarga el plan del PT en la primera serie`() = runTest {
        start()
        collect()
        assertEquals(Load(40.0, 8), state.load)
        assertEquals(Cursor(0, 1), state.workout?.cursor)
    }

    @Test fun `ajustar el peso nunca baja de 0 y la carga manual reemplaza todo`() = runTest {
        start()
        collect()
        vm.onAdjustKg(2.5)
        assertEquals(42.5, state.load.kg, 0.0)
        vm.onAdjustKg(-100.0)
        assertEquals(0.0, state.load.kg, 0.0)
        vm.onManualEntry(62.5, 12)
        assertEquals(Load(62.5, 12), state.load)
    }

    @Test fun `confirmar arranca el descanso y la serie 2 precarga lo de la 1`() = runTest {
        start()
        collect()
        vm.onAdjustKg(-2.5)

        vm.onConfirm()

        assertTrue(state.isResting)
        assertEquals(Cursor(0, 2), state.workout?.cursor)
        assertEquals(Load(37.5, 8), state.load)
    }

    @Test fun `corregir una serie hecha no arranca descanso y vuelve a la serie en curso`() = runTest {
        start()
        collect()
        vm.onConfirm()
        vm.onRestSkip()

        vm.onSelectSet(1)
        assertTrue(state.isCorrecting)
        vm.onManualEntry(45.0, 6)
        vm.onConfirm()

        assertNull(state.editingSet)
        assertFalse(state.isResting)
        assertEquals(45.0, state.workout?.sets?.single()?.kg)
    }

    @Test fun `terminar muestra el resumen y no cierra la pantalla`() = runTest {
        start()
        collect()
        vm.onConfirm()
        clock.millis += 10 * 60_000L

        vm.onFinish()

        assertEquals(WorkoutSummary(1, 10), state.summary)
        assertFalse(state.closed)
    }

    @Test fun `la ultima serie lleva directo al resumen`() = runTest {
        start(ex(0))
        collect()
        vm.onConfirm()
        vm.onRestSkip()
        vm.onConfirm()

        assertEquals(2, state.summary?.sets)
    }

    @Test fun `terminar sin series y descartar cierran la pantalla`() = runTest {
        start()
        collect()
        vm.onFinish()
        assertTrue(state.closed)

        start()
        vm.onDiscard()
        assertTrue(state.closed)
    }

    @Test fun `si Room falla avisa y no avanza`() = runTest {
        start()
        collect()
        dao.failWrites = true

        vm.onConfirm()

        assertEquals(SAVE_FAILED, state.error)
        assertEquals(Cursor(0, 1), state.workout?.cursor)
        assertEquals(Load(40.0, 8), state.load)
    }

    @Test fun `al abrir con el descanso vencido vuelve a la serie`() = runTest {
        start()
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        clock.millis += 5 * 60_000L

        collect()

        assertFalse(state.isResting)
        assertEquals(Cursor(0, 2), state.workout?.cursor)
    }
}
```

- [ ] **Step 5: Correr los tests y ver que fallan**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.*"`
Expected: FAIL de compilación ("Unresolved reference: WorkoutViewModel").

- [ ] **Step 6: Escribir el ViewModel** `ui/workout/WorkoutViewModel.kt`

```kotlin
package com.fittrainer.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.SaveOutcome
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.data.workout.exercise
import com.fittrainer.data.workout.preload
import com.fittrainer.data.workout.setAt
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Sesión activa. Todo sale de Room (vía [WorkoutRepository]); acá solo vive lo que el alumno está
 * ajustando de la serie en pantalla y el cierre en curso. Ninguna acción usa la red.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class WorkoutViewModel @Inject constructor(
    private val repository: WorkoutRepository,
    libraryRepository: LibraryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val active: StateFlow<Workout?> = ownerId.filterNotNull()
        .flatMapLatest { repository.observeActive(it) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val library = ownerId.filterNotNull().flatMapLatest { libraryRepository.observeCache(it) }
    private val local = MutableStateFlow(Local())

    private data class Local(
        val loaded: Boolean = false,
        val load: Load = Load(0.0, 0),
        /** Para qué serie se calculó [load]: si cambia, se vuelve a precargar. */
        val loadKey: LoadKey? = null,
        val editingSet: Int? = null,
        val ending: Boolean = false,
        val summary: WorkoutSummary? = null,
        val error: String? = null,
    )

    private data class LoadKey(val workoutId: String, val position: Int, val setNumber: Int, val exerciseId: String)

    val uiState: StateFlow<WorkoutUiState> =
        combine(active, local, connectivity.isOnline, library) { w, l, online, lib ->
            WorkoutUiState(l.loaded, w, l.load, l.editingSet, l.ending, l.summary, l.error, !online, lib)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), WorkoutUiState())

    init {
        viewModelScope.launch {
            ownerId.filterNotNull().collect { owner ->
                // Si la app estuvo cerrada más que el descanso, al abrir se vuelve directo a la serie.
                repository.endRestIfOver(owner)
            }
        }
        viewModelScope.launch {
            val editing = local.map { it.editingSet }.distinctUntilChanged()
            combine(active, editing) { w, e -> w to e }.collect { (w, e) ->
                refreshLoad(w, e)
            }
        }
    }

    /** Precarga cuando cambia la serie en pantalla (o el ejercicio, por un reemplazo). */
    private suspend fun refreshLoad(w: Workout?, editing: Int?) {
        if (w == null) {
            local.update { it.copy(loaded = true) }
            return
        }
        val setNumber = editing ?: w.cursor.setNumber
        val exercise = w.exercise(w.cursor.position)
        val key = LoadKey(w.id, w.cursor.position, setNumber, exercise.exerciseId)
        if (local.value.loadKey == key && local.value.loaded) return
        val last = repository.lastSetFor(w.ownerId, exercise.exerciseId)
        val load = w.preload(Cursor(w.cursor.position, setNumber), last)
        local.update { it.copy(loaded = true, loadKey = key, load = load) }
    }

    fun now(): Instant = clock.instant()

    fun onAdjustKg(delta: Double) = local.update { it.copy(load = it.load.copy(kg = (it.load.kg + delta).coerceAtLeast(0.0))) }

    fun onManualEntry(kg: Double, reps: Int) =
        local.update { it.copy(load = Load(kg.coerceAtLeast(0.0), reps.coerceAtLeast(0))) }

    /** Solo se elige una serie ya hecha (para corregirla) o la del cursor (para volver). */
    fun onSelectSet(setNumber: Int) {
        val w = active.value ?: return
        val editing = setNumber.takeIf { it != w.cursor.setNumber && w.setAt(w.cursor.position, it) != null }
        local.update { it.copy(editingSet = editing) }
    }

    fun onSelectExercise(position: Int) = write { owner ->
        local.update { it.copy(editingSet = null) }
        repository.moveTo(owner, position)
    }

    fun onConfirm() {
        val w = active.value ?: return
        val load = local.value.load
        val setNumber = local.value.editingSet ?: w.cursor.setNumber
        write { owner ->
            when (repository.saveSet(owner, w.cursor.position, setNumber, load)) {
                SaveOutcome.Corrected -> local.update { it.copy(editingSet = null) }
                SaveOutcome.AllDone -> finish(owner)
                SaveOutcome.Advanced, null -> Unit
            }
        }
    }

    fun onRestAdjust(deltaSeconds: Int) = write { repository.adjustRest(it, deltaSeconds) }

    fun onRestTogglePause() = write { repository.toggleRestPause(it) }

    fun onRestSkip() = write { repository.skipRest(it) }

    /** La pantalla vio el descanso en 0. Si el service ya lo cerró, no hace nada. */
    fun onRestElapsed() = write { repository.endRestIfOver(it) }

    fun onReplace(exercise: LibraryExercise) {
        val position = active.value?.cursor?.position ?: return
        write { repository.replaceExercise(it, position, exercise) }
    }

    fun onFinish() = write { finish(it) }

    fun onDiscard() = write { repository.discard(it) }

    fun dismissError() = local.update { it.copy(error = null) }

    /** ending antes de terminar: la sesión deja de estar abierta antes de que llegue el resumen. */
    private suspend fun finish(owner: String) {
        local.update { it.copy(ending = true) }
        try {
            val summary = repository.finish(owner)
            local.update { it.copy(summary = summary, ending = summary != null) }
        } catch (e: Exception) {
            local.update { it.copy(ending = false) }
            throw e
        }
    }

    /** Si Room falla, avisa y no cambia nada: la serie sigue en pantalla para reintentar. */
    private fun write(block: suspend (String) -> Unit) {
        val owner = ownerId.value ?: return
        viewModelScope.launch {
            try {
                block(owner)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                local.update { it.copy(error = SAVE_FAILED) }
            }
        }
    }
}
```

- [ ] **Step 7: Correr los tests y ver que pasan**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.*"`
Expected: PASS (14 tests).

- [ ] **Step 8: Cerrar la tarea**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL. No commitear.

---

### Task 5: Timer en segundo plano (service, notificaciones, manifest)

**Files:**
- Create: `main/java/com/fittrainer/ui/workout/service/NotificationTexts.kt`
- Create: `main/java/com/fittrainer/ui/workout/service/WorkoutNotifications.kt`
- Create: `main/java/com/fittrainer/ui/workout/service/WorkoutService.kt`
- Create: `main/res/drawable/ic_stat_workout.xml`
- Modify: `main/AndroidManifest.xml`
- Test: `test/java/com/fittrainer/ui/workout/service/NotificationTextsTest.kt`

**Interfaces:**
- Consumes:
  - de la Task 3: `WorkoutRepository.observeActive` y `endRestIfOver`;
  - de la Task 1: `restJustEnded`, `remainingMs`, `isPaused`, `exercise` y `lastDoneSet`;
  - código existente: `SessionRepository` y `MainActivity`.
- Produces:
  - `WorkoutService.start(context: Context)`;
  - `WorkoutNotifications.EXTRA_OPEN_WORKOUT` (`"com.fittrainer.OPEN_WORKOUT"`): la Task 7 la lee en `MainActivity`;
  - `notificationsAllowed(context): Boolean`.

- [ ] **Step 1: Escribir los tests de los textos** `ui/workout/service/NotificationTextsTest.kt`

```kotlin
package com.fittrainer.ui.workout.service

import com.fittrainer.data.workout.Cursor
import com.fittrainer.data.workout.Load
import com.fittrainer.testing.fakes.workout.workout
import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationTextsTest {

    @Test fun `la notificacion fija dice ejercicio y serie`() {
        val w = workout(cursor = Cursor(1, 2))
        assertEquals("Sesión en curso", ongoingTitle(w, resting = false))
        assertEquals("Descanso", ongoingTitle(w, resting = true))
        assertEquals("Ejercicio 1 · S2/2", ongoingText(w))
    }

    @Test fun `el fin del descanso anticipa la proxima serie`() {
        assertEquals("Próxima: 70 kg × 8", restDoneText(Load(70.0, 8)))
        assertEquals("Próxima: 62,5 kg × 10", restDoneText(Load(62.5, 10)))
    }
}
```

- [ ] **Step 2: Escribir los textos** `ui/workout/service/NotificationTexts.kt`

```kotlin
package com.fittrainer.ui.workout.service

import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.exercise
import com.fittrainer.ui.components.exercise.formatKg

const val REST_DONE_TITLE = "Descanso terminado"

fun ongoingTitle(w: Workout, resting: Boolean): String = if (resting) "Descanso" else "Sesión en curso"

fun ongoingText(w: Workout): String {
    val e = w.exercise(w.cursor.position)
    return "${e.name} · S${w.cursor.setNumber}/${e.totalSets}"
}

fun restDoneText(next: Load): String = "Próxima: ${formatKg(next.kg)} × ${next.reps}"
```

- [ ] **Step 3: Correr el test**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.service.*"`
Expected: PASS.

- [ ] **Step 4: Ícono chico de la notificación** `main/res/drawable/ic_stat_workout.xml` (blanco; Android lo tiñe)

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <!-- Mancuerna simple -->
    <path android:fillColor="#FFFFFFFF"
        android:pathData="M2,10h2V8h3v8H4v-2H2V10zM17,8h3v2h2v4h-2v2h-3V8zM8,11h8v2H8V11z" />
</vector>
```

- [ ] **Step 5: Escribir las notificaciones** `ui/workout/service/WorkoutNotifications.kt`

```kotlin
package com.fittrainer.ui.workout.service

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.fittrainer.MainActivity
import com.fittrainer.R
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout

/** En Android 13+ hace falta el permiso; antes, alcanza con que el usuario no las haya apagado. */
fun notificationsAllowed(context: Context): Boolean =
    (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
        NotificationManagerCompat.from(context).areNotificationsEnabled()

object WorkoutNotifications {
    const val EXTRA_OPEN_WORKOUT = "com.fittrainer.OPEN_WORKOUT"
    const val ID_ONGOING = 1001
    private const val ID_REST_DONE = 1002
    private const val CHANNEL_ONGOING = "workout_ongoing"
    private const val CHANNEL_REST_DONE = "workout_rest_done"

    /** Idempotente: crear un canal que ya existe no hace nada. */
    fun createChannels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ONGOING, "Sesión en curso", NotificationManager.IMPORTANCE_LOW),
        )
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_REST_DONE, "Fin del descanso", NotificationManager.IMPORTANCE_HIGH).apply {
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            },
        )
    }

    /** La que exige startForeground antes de leer Room. */
    fun starting(context: Context): Notification = ongoingBuilder(context).setContentTitle("Sesión en curso").build()

    /** Durante el descanso, el sistema cuenta para atrás solo (sin redibujar cada segundo). */
    fun ongoing(context: Context, w: Workout): Notification {
        val restEnd = w.rest?.endsAt
        return ongoingBuilder(context)
            .setContentTitle(ongoingTitle(w, resting = w.rest != null))
            .setContentText(ongoingText(w))
            .apply {
                if (restEnd != null) {
                    setUsesChronometer(true)
                    setChronometerCountDown(true)
                    setWhen(restEnd.toEpochMilli())
                    setShowWhen(true)
                }
            }
            .build()
    }

    fun notifyRestDone(context: Context, next: Load) {
        if (!notificationsAllowed(context)) return
        val notification = NotificationCompat.Builder(context, CHANNEL_REST_DONE)
            .setSmallIcon(R.drawable.ic_stat_workout)
            .setContentTitle(REST_DONE_TITLE)
            .setContentText(restDoneText(next))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setContentIntent(openIntent(context))
            .build()
        try {
            NotificationManagerCompat.from(context).notify(ID_REST_DONE, notification)
        } catch (e: SecurityException) {
            // El permiso se revocó entre el chequeo y el aviso: el timer en pantalla sigue andando.
        }
    }

    private fun ongoingBuilder(context: Context) = NotificationCompat.Builder(context, CHANNEL_ONGOING)
        .setSmallIcon(R.drawable.ic_stat_workout)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
        .setContentIntent(openIntent(context))

    private fun openIntent(context: Context): PendingIntent = PendingIntent.getActivity(
        context,
        0,
        Intent(context, MainActivity::class.java)
            .putExtra(EXTRA_OPEN_WORKOUT, true)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
}
```

- [ ] **Step 6: Escribir el service** `ui/workout/service/WorkoutService.kt`

```kotlin
package com.fittrainer.ui.workout.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.data.workout.isPaused
import com.fittrainer.data.workout.preload
import com.fittrainer.data.workout.remainingMs
import com.fittrainer.data.workout.restJustEnded
import dagger.hilt.android.AndroidEntryPoint
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Foreground service mientras hay una sesión abierta (spec §5): mantiene viva la app con la notificación
 * fija y avisa el fin del descanso aunque el celular esté bloqueado. No guarda estado propio: todo sale de
 * Room. Si Android lo mata, al reabrir la app se retoma desde Room (START_NOT_STICKY).
 */
@AndroidEntryPoint
class WorkoutService : Service() {

    @Inject lateinit var repository: WorkoutRepository
    @Inject lateinit var sessionRepository: SessionRepository
    @Inject lateinit var clock: Clock

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var observing = false
    /** Fin del descanso que estaba corriendo en la emisión anterior. */
    private var runningRestEnd: Instant? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        WorkoutNotifications.createChannels(this)
        // Android exige startForeground enseguida: primero la notificación genérica, después la real.
        ServiceCompat.startForeground(
            this, WorkoutNotifications.ID_ONGOING, WorkoutNotifications.starting(this),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
        )
        if (!observing) {
            observing = true
            scope.launch { observe() }
        }
        return START_NOT_STICKY
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    private suspend fun observe() {
        sessionRepository.session
            .map { (it as? Session.Student)?.user?.id }
            .distinctUntilChanged()
            .flatMapLatest { owner -> if (owner == null) flowOf(null) else repository.observeActive(owner) }
            .collectLatest { workout -> onWorkout(workout) }
    }

    private suspend fun onWorkout(workout: Workout?) {
        if (workout == null) {
            stopSelf()
            return
        }
        val now = clock.instant()
        val running = workout.rest?.takeUnless { it.isPaused }?.endsAt
        // La pantalla cerró el descanso al llegar a 0 antes que el service: igual hay que avisar.
        if (restJustEnded(runningRestEnd, running, now)) notifyRestDone(workout)
        runningRestEnd = running
        updateOngoing(workout)
        if (running == null) return releaseWakeLock()
        // Con la pantalla apagada la CPU duerme y el delay se atrasa: un wake lock parcial hasta el fin.
        val left = workout.rest!!.remainingMs(now)
        acquireWakeLock(left + 10_000)
        try {
            delay(left)
            runningRestEnd = null
            notifyRestDone(workout)
            repository.endRestIfOver(workout.ownerId)
        } finally {
            releaseWakeLock()
        }
    }

    /** Sin permiso de notificaciones no se actualiza el texto; el foreground sigue igual. */
    private fun updateOngoing(workout: Workout) {
        if (!notificationsAllowed(this)) return
        try {
            NotificationManagerCompat.from(this).notify(WorkoutNotifications.ID_ONGOING, WorkoutNotifications.ongoing(this, workout))
        } catch (e: SecurityException) {
            // El permiso se revocó recién: el timer en pantalla sigue andando.
        }
    }

    private fun notifyRestDone(workout: Workout) {
        // El cursor ya está en la próxima serie: se anticipa con el plan o lo hecho hoy.
        WorkoutNotifications.notifyRestDone(this, workout.preload(workout.cursor, null))
    }

    private fun acquireWakeLock(timeoutMs: Long) {
        releaseWakeLock()
        val power = getSystemService(PowerManager::class.java)
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "FitTrainer:rest").apply { acquire(timeoutMs) }
    }

    private fun releaseWakeLock() {
        wakeLock?.takeIf { it.isHeld }?.release()
        wakeLock = null
    }

    override fun onDestroy() {
        releaseWakeLock()
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        /** Se llama desde la pantalla de la sesión (app al frente): Android permite arrancarlo. */
        fun start(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, WorkoutService::class.java))
        }
    }
}
```

- [ ] **Step 7: Manifest** — en `main/AndroidManifest.xml`, debajo de los `uses-permission` que ya hay:

```xml
    <!-- Sesión activa (tarjeta 10): timer de descanso con el celular bloqueado. -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
```

y adentro de `<application>`, después del `<activity>`:

```xml
        <service
            android:name=".ui.workout.service.WorkoutService"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Timer de descanso entre series de una sesión de entrenamiento" />
        </service>
```

- [ ] **Step 8: Cerrar la tarea**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest lintDebug`
Expected: BUILD SUCCESSFUL, sin errores de lint nuevos (`MissingPermission`, `ForegroundServiceType`). Si `lintDebug` no se corría antes en el repo y tiene errores viejos, alcanza con que no aparezcan errores en los archivos nuevos. No commitear.

---

### Task 6: Pantallas de la sesión

**Files:**
- Create: `main/java/com/fittrainer/ui/workout/WorkoutScreen.kt`, `WorkoutContent.kt`
- Create: `main/java/com/fittrainer/ui/workout/components/WorkoutTopBar.kt`, `SetTabs.kt`, `LoadPanel.kt`, `BottomActions.kt`, `RestTimer.kt`, `ExitMenu.kt`, `ManualEntryDialog.kt`, `ReplaceSheet.kt`, `ExerciseListSheet.kt`, `WorkoutSummaryView.kt`

**Interfaces:**
- Consumes:
  - de la Task 4: `WorkoutViewModel`, `WorkoutUiState` y `WorkoutTexts`;
  - de la Task 5: `WorkoutService.start` y `notificationsAllowed`;
  - código existente: `ExerciseDetailSheet`, `ExerciseDetail`, `MuscleChips`, `availableGroups`, `muscleLabel`, `InfoCard`, `NoticeBanner` y `FtColors`/`Spacing`.
- Produces: `@Composable fun WorkoutScreen(onExit: () -> Unit, viewModel: WorkoutViewModel = hiltViewModel())`.

Esta tarea es UI: no lleva tests unitarios. El comportamiento lo cubren los tests de la Task 4 y el E2E de la Task 8. Cada archivo queda en 200 líneas o menos.

- [ ] **Step 1: Barra superior** `components/WorkoutTopBar.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.firstPendingSet
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.exerciseCounter

/** ✕, "EJERCICIO 3 / 6" + nombre (tocable: abre la lista), cronómetro y un segmento por ejercicio. */
@Composable
fun WorkoutTopBar(workout: Workout, title: String, elapsed: String, onClose: () -> Unit, onOpenList: () -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = "Salir de la sesión") }
            Column(
                Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget).clickable(onClick = onOpenList),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(exerciseCounter(workout), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
                Text(title, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary, maxLines = 1)
            }
            Box(
                Modifier.clip(MaterialTheme.shapes.small).background(FtColors.Card).padding(horizontal = Spacing.sm, vertical = Spacing.xs),
            ) {
                Text("⏱ $elapsed", style = MaterialTheme.typography.labelMedium, color = FtColors.TextPrimary)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            workout.exercises.forEach { e ->
                val color = when {
                    workout.firstPendingSet(e.position) == null -> FtColors.Brand
                    e.position == workout.cursor.position -> FtColors.BrandText
                    else -> FtColors.Elevated
                }
                Box(Modifier.weight(1f).height(3.dp).clip(MaterialTheme.shapes.extraSmall).background(color))
            }
        }
    }
}
```

- [ ] **Step 2: Tabs de series** `components/SetTabs.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.exercise
import com.fittrainer.data.workout.setAt
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.setTabLabel

/** S1…Sn: hechas con "kg·reps" (tocables para corregir), la de pantalla resaltada, las que faltan apagadas. */
@Composable
fun SetTabs(workout: Workout, shownSet: Int, onSelect: (Int) -> Unit) {
    val position = workout.cursor.position
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        (1..workout.exercise(position).totalSets).forEach { n ->
            val done = workout.setAt(position, n)
            val selected = n == shownSet
            val tappable = done != null || n == workout.cursor.setNumber
            val background = when {
                selected -> FtColors.Brand
                done != null -> FtColors.Elevated
                else -> FtColors.Card
            }
            Column(
                Modifier
                    .weight(1f)
                    .heightIn(min = 52.dp)
                    .clip(MaterialTheme.shapes.medium)
                    .background(background)
                    .clickable(enabled = tappable) { onSelect(n) }
                    .padding(vertical = Spacing.xs),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val textColor = if (done == null && !selected) FtColors.Ink5 else FtColors.TextPrimary
                Text("S$n", style = MaterialTheme.typography.titleSmall, color = textColor)
                done?.let { Text(setTabLabel(it), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary) }
            }
        }
    }
}
```

- [ ] **Step 3: Panel de carga** `components/LoadPanel.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrainer.data.workout.Load
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.kgNumber

private val STEPS = listOf(-2.5, -1.0, 1.0, 2.5, 5.0)

/** Chip del plan del PT, peso y reps en 72 sp, y los ajustes rápidos (spec §3, mockup p.13). */
@Composable
fun LoadPanel(chip: String?, load: Load, onAdjust: (Double) -> Unit, onEdit: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        chip?.let {
            Box(Modifier.clip(MaterialTheme.shapes.extraLarge).background(FtColors.Card).padding(horizontal = Spacing.md, vertical = Spacing.xs)) {
                Text("✦ $it", style = MaterialTheme.typography.labelSmall, color = FtColors.BrandText)
            }
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            BigNumber("PESO", kgNumber(load.kg), "KG", Modifier.weight(1f))
            Box(Modifier.width(1.dp).height(72.dp).background(FtColors.Border))
            BigNumber("REPS", load.reps.toString(), "×", Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            STEPS.forEach { step ->
                FilledTonalButton(
                    onClick = { onAdjust(step) },
                    modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget),
                    contentPadding = PaddingValues(0.dp),
                ) { Text(stepLabel(step), style = MaterialTheme.typography.labelLarge) }
            }
            FilledTonalButton(
                onClick = onEdit,
                modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget),
                contentPadding = PaddingValues(0.dp),
            ) { Icon(Icons.Filled.Edit, contentDescription = "Escribir peso y reps") }
        }
    }
}

@Composable
private fun BigNumber(label: String, value: String, unit: String, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, style = MaterialTheme.typography.displayLarge.copy(fontSize = 72.sp, lineHeight = 76.sp), color = FtColors.TextPrimary)
            Text(unit, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary, modifier = Modifier.padding(bottom = Spacing.md))
        }
    }
}

private fun stepLabel(step: Double): String {
    val sign = if (step > 0) "+" else "−"
    return sign + kgNumber(kotlin.math.abs(step))
}
```

- [ ] **Step 4: Acciones de abajo** `components/BottomActions.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.Spacing

/** Técnica (hoja de la biblioteca), Reemplazar e IA (deshabilitado: es del sprint 5). */
@Composable
fun BottomActions(canReplace: Boolean, onTechnique: () -> Unit, onReplace: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        OutlinedButton(onClick = onTechnique, modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget)) { Text("Técnica") }
        OutlinedButton(
            onClick = onReplace,
            enabled = canReplace,
            modifier = Modifier.weight(1.3f).heightIn(min = Spacing.minTouchTarget),
        ) { Text("Reemplazar") }
        OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.weight(0.7f).heightIn(min = Spacing.minTouchTarget)) { Text("IA") }
    }
}
```

- [ ] **Step 5: Timer** `components/RestTimer.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.formatClock

/** Mockup p.14: lo que se hizo, anillo con la cuenta, ±15 / pausa / saltar y la próxima serie. */
@Composable
fun RestTimer(
    doneLine: String?,
    remainingMs: Long,
    totalSeconds: Int,
    paused: Boolean,
    nextLabel: String,
    nextLoad: String,
    onAdjust: (Int) -> Unit,
    onTogglePause: () -> Unit,
    onSkip: () -> Unit,
) {
    Column(
        Modifier.fillMaxSize().padding(Spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.xl, Alignment.CenterVertically),
    ) {
        doneLine?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary) }
        Text("DESCANSO", style = MaterialTheme.typography.labelMedium, color = FtColors.BrandText)
        Box(Modifier.size(240.dp), contentAlignment = Alignment.Center) {
            val progress = if (totalSeconds == 0) 0f else (remainingMs / (totalSeconds * 1_000f)).coerceIn(0f, 1f)
            Canvas(Modifier.fillMaxSize()) {
                val stroke = Stroke(width = 10.dp.toPx(), cap = StrokeCap.Round)
                drawArc(FtColors.Elevated, 0f, 360f, useCenter = false, style = stroke)
                drawArc(FtColors.Brand, -90f, 360f * progress, useCenter = false, style = stroke)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    formatClock(remainingMs),
                    style = MaterialTheme.typography.displayLarge.copy(fontSize = 72.sp, lineHeight = 76.sp),
                    color = FtColors.TextPrimary,
                )
                Text("DE ${formatClock(totalSeconds * 1_000L)}", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            TimerButton("+15″", Modifier.weight(1f)) { onAdjust(15) }
            TimerButton("−15″", Modifier.weight(1f)) { onAdjust(-15) }
            TimerButton(if (paused) "Seguir" else "Pausar", Modifier.weight(1f), onTogglePause)
            TimerButton("Saltar", Modifier.weight(1f), onSkip)
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(nextLabel, style = MaterialTheme.typography.labelSmall, color = FtColors.BrandText)
            Text(nextLoad, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
        }
    }
}

@Composable
private fun TimerButton(text: String, modifier: Modifier, onClick: () -> Unit) {
    FilledTonalButton(onClick = onClick, modifier = modifier.heightIn(min = Spacing.minTouchTarget)) { Text(text) }
}
```

- [ ] **Step 6: Menú de salida y confirmaciones** `components/ExitMenu.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.missingSetsMessage

enum class ExitStep { Menu, ConfirmFinish, ConfirmDiscard }

/** ✕ de la sesión (spec §3): terminar (confirma si faltan series), descartar (confirma) o seguir. */
@Composable
fun ExitMenu(step: ExitStep, pendingSets: Int, onStep: (ExitStep?) -> Unit, onFinish: () -> Unit, onDiscard: () -> Unit) {
    when (step) {
        ExitStep.Menu -> AlertDialog(
            onDismissRequest = { onStep(null) },
            title = { Text("¿Qué hacemos con la sesión?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    Button(
                        onClick = { if (pendingSets > 0) onStep(ExitStep.ConfirmFinish) else onFinish() },
                        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    ) { Text("Terminar sesión") }
                    OutlinedButton(
                        onClick = { onStep(ExitStep.ConfirmDiscard) },
                        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    ) { Text("Descartar sesión", color = FtColors.Coral) }
                }
            },
            confirmButton = { TextButton(onClick = { onStep(null) }) { Text("Seguir entrenando") } },
        )
        ExitStep.ConfirmFinish -> AlertDialog(
            onDismissRequest = { onStep(null) },
            text = { Text(missingSetsMessage(pendingSets)) },
            confirmButton = { TextButton(onClick = onFinish) { Text("Terminar") } },
            dismissButton = { TextButton(onClick = { onStep(null) }) { Text("Seguir entrenando") } },
        )
        ExitStep.ConfirmDiscard -> AlertDialog(
            onDismissRequest = { onStep(null) },
            title = { Text("¿Descartar la sesión?") },
            text = { Text("Se borra todo lo de esta sesión") },
            confirmButton = { TextButton(onClick = onDiscard) { Text("Descartar", color = FtColors.Coral) } },
            dismissButton = { TextButton(onClick = { onStep(null) }) { Text("Cancelar") } },
        )
    }
}
```

- [ ] **Step 7: Carga manual** `components/ManualEntryDialog.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.input.KeyboardType
import com.fittrainer.data.workout.Load
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.kgNumber

/** Lápiz: peso decimal (acepta coma) y reps enteras. "Listo" solo con valores válidos. */
@Composable
fun ManualEntryDialog(initial: Load, onDismiss: () -> Unit, onDone: (Double, Int) -> Unit) {
    var kg by remember { mutableStateOf(kgNumber(initial.kg)) }
    var reps by remember { mutableStateOf(initial.reps.toString()) }
    val kgValue = kg.replace(',', '.').toDoubleOrNull()?.takeIf { it >= 0 }
    val repsValue = reps.toIntOrNull()?.takeIf { it >= 0 }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Peso y reps") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                OutlinedTextField(
                    value = kg, onValueChange = { kg = it }, label = { Text("Peso (kg)") }, singleLine = true,
                    isError = kgValue == null, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
                OutlinedTextField(
                    value = reps, onValueChange = { reps = it }, label = { Text("Reps") }, singleLine = true,
                    isError = repsValue == null, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onDone(kgValue!!, repsValue!!) }, enabled = kgValue != null && repsValue != null) { Text("Listo") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}
```

- [ ] **Step 8: Reemplazar** `components/ReplaceSheet.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.library.availableGroups
import com.fittrainer.ui.library.components.MuscleChips
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.LIBRARY_NEVER_SYNCED

/** Biblioteca de Room filtrada por el grupo del ejercicio; los chips cambian de grupo (spec §3). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReplaceSheet(
    library: LibraryCache,
    currentGroup: String?,
    currentExerciseId: String,
    onDismiss: () -> Unit,
    onPick: (LibraryExercise) -> Unit,
) {
    var group by remember { mutableStateOf(currentGroup) }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Text("Reemplazar ejercicio", style = MaterialTheme.typography.titleLarge)
            if (library.lastSyncedAt == null) {
                InfoCard("Todavía no hay biblioteca", LIBRARY_NEVER_SYNCED)
                return@Column
            }
            MuscleChips(availableGroups(library.exercises), group) { group = it }
            val shown = library.exercises.filter { (group == null || it.muscleGroup == group) && it.id != currentExerciseId }
            LazyColumn(contentPadding = PaddingValues(bottom = Spacing.xl), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                items(shown, key = { it.id }) { e ->
                    ExerciseRow(e.name, muscleLabel(e.muscleGroup), onClick = { onPick(e) })
                }
            }
        }
    }
}
```

- [ ] **Step 9: Lista de ejercicios** `components/ExerciseListSheet.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.runtime.Composable
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.exercise
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.theme.Spacing

/** Tocar el nombre del ejercicio: saltar a cualquiera de la sesión. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseListSheet(workout: Workout, onDismiss: () -> Unit, onPick: (Int) -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        LazyColumn(
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            items(workout.exercises, key = { it.position }) { e ->
                val done = workout.sets.count { it.position == e.position }
                ExerciseRow("${e.position + 1}. ${e.name}", "$done/${workout.exercise(e.position).totalSets} series", onClick = { onPick(e.position) })
            }
        }
    }
}
```

- [ ] **Step 10: Cierre** `components/WorkoutSummaryView.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.data.workout.WorkoutSummary
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.summaryText

/** "Sesión terminada · N series · M min". El RPE y las notas son de la tarjeta 12. */
@Composable
fun WorkoutSummaryView(summary: WorkoutSummary, onBack: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(Spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.xl, Alignment.CenterVertically),
    ) {
        Text("¡Bien ahí!", style = MaterialTheme.typography.displayMedium, color = FtColors.TextPrimary)
        Text(summaryText(summary), style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary)
        Button(onClick = onBack, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) { Text("Volver a Hoy") }
    }
}
```

- [ ] **Step 11: Contenido de la serie** `ui/workout/WorkoutContent.kt`

```kotlin
package com.fittrainer.ui.workout

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.workout.canReplace
import com.fittrainer.data.workout.isPaused
import com.fittrainer.data.workout.lastDoneSet
import com.fittrainer.data.workout.remainingMs
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.components.BottomActions
import com.fittrainer.ui.workout.components.LoadPanel
import com.fittrainer.ui.workout.components.RestTimer
import com.fittrainer.ui.workout.components.SetTabs
import com.fittrainer.ui.workout.components.WorkoutTopBar
import java.time.Instant

/** Todo lo que la pantalla le pide al VM o abre (diálogos, hojas). */
class WorkoutActions(
    val onClose: () -> Unit,
    val onOpenList: () -> Unit,
    val onSelectSet: (Int) -> Unit,
    val onAdjustKg: (Double) -> Unit,
    val onEdit: () -> Unit,
    val onConfirm: () -> Unit,
    val onTechnique: () -> Unit,
    val onReplace: () -> Unit,
    val onRestAdjust: (Int) -> Unit,
    val onRestTogglePause: () -> Unit,
    val onRestSkip: () -> Unit,
    val onOpenSettings: () -> Unit,
    val onDismissError: () -> Unit,
)

/** Serie (mockup p.13) o timer a pantalla completa (p.14). Sin scroll para completar una serie. */
@Composable
fun WorkoutContent(state: WorkoutUiState, now: Instant, notificationsOn: Boolean, actions: WorkoutActions) {
    val workout = state.workout ?: return
    val exercise = state.exercise ?: return
    val rest = workout.rest
    if (state.isResting && rest != null) {
        val done = workout.lastDoneSet()
        RestTimer(
            doneLine = done?.let { "SERIE ${it.setNumber} · ${kgNumber(it.kg)}KG × ${it.reps} ✓" },
            remainingMs = rest.remainingMs(now),
            totalSeconds = rest.totalSeconds,
            paused = rest.isPaused,
            nextLabel = "PRÓXIMA SERIE · ${workout.cursor.setNumber}/${exercise.totalSets} · ${exercise.name}",
            nextLoad = loadLine(state.load),
            onAdjust = actions.onRestAdjust,
            onTogglePause = actions.onRestTogglePause,
            onSkip = actions.onRestSkip,
        )
        return
    }
    Column(
        Modifier.fillMaxSize().padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg),
    ) {
        WorkoutTopBar(workout, exercise.name, formatElapsed(workout.startedAt, now), actions.onClose, actions.onOpenList)
        if (!notificationsOn) {
            // Tocar el aviso abre los Ajustes de notificaciones de la app.
            Text(
                NO_NOTIFICATIONS,
                style = MaterialTheme.typography.bodySmall,
                color = FtColors.Amber,
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clickable(onClick = actions.onOpenSettings),
            )
        }
        state.error?.let { NoticeBanner(it, actions.onDismissError) }
        SetTabs(workout, state.shownSet, actions.onSelectSet)
        LoadPanel(suggestedChip(exercise), state.load, actions.onAdjustKg, actions.onEdit)
        Button(onClick = actions.onConfirm, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) {
            Text(ctaLabel(state), style = MaterialTheme.typography.labelLarge)
        }
        Spacer(Modifier.weight(1f))
        if (!workout.canReplace(workout.cursor.position)) {
            Text(REPLACE_LOCKED, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        BottomActions(workout.canReplace(workout.cursor.position), actions.onTechnique, actions.onReplace)
    }
}
```

- [ ] **Step 12: La pantalla** `ui/workout/WorkoutScreen.kt`

```kotlin
package com.fittrainer.ui.workout

import android.Manifest
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.workout.isOver
import com.fittrainer.data.workout.pendingSets
import com.fittrainer.ui.components.exercise.ExerciseDetail
import com.fittrainer.ui.components.exercise.ExerciseDetailSheet
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.workout.components.ExerciseListSheet
import com.fittrainer.ui.workout.components.ExitMenu
import com.fittrainer.ui.workout.components.ExitStep
import com.fittrainer.ui.workout.components.ManualEntryDialog
import com.fittrainer.ui.workout.components.ReplaceSheet
import com.fittrainer.ui.workout.components.WorkoutSummaryView
import com.fittrainer.ui.workout.service.WorkoutService
import com.fittrainer.ui.workout.service.notificationsAllowed
import kotlinx.coroutines.delay

private enum class Overlay { Edit, Technique, Replace, List }

/** Guía Mobile p.13-14 · Sesión activa y timer de descanso. */
@Composable
fun WorkoutScreen(onExit: () -> Unit, viewModel: WorkoutViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var notificationsOn by remember { mutableStateOf(notificationsAllowed(context)) }
    val askPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        notificationsOn = notificationsAllowed(context)
    }
    LaunchedEffect(Unit) {
        WorkoutService.start(context)
        if (!notificationsOn && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            askPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
    // Volviendo de Ajustes: el permiso pudo cambiar.
    LifecycleResumeEffect(Unit) {
        notificationsOn = notificationsAllowed(context)
        onPauseOrDispose { }
    }
    LaunchedEffect(state.closed) { if (state.closed) onExit() }

    val now by produceState(viewModel.now()) {
        while (true) {
            value = viewModel.now()
            delay(250)
        }
    }
    val rest = state.workout?.rest
    LaunchedEffect(rest, now) { if (rest != null && rest.isOver(now)) viewModel.onRestElapsed() }
    // Durante el descanso la pantalla no se apaga sola (celular apoyado en el banco).
    val view = LocalView.current
    DisposableEffect(state.isResting) {
        view.keepScreenOn = state.isResting
        onDispose { view.keepScreenOn = false }
    }

    var exit by remember { mutableStateOf<ExitStep?>(null) }
    var overlay by remember { mutableStateOf<Overlay?>(null) }
    Box(Modifier.fillMaxSize().background(FtColors.Background).safeDrawingPadding()) {
        state.summary?.let {
            WorkoutSummaryView(it, onExit)
            return@Box
        }
        WorkoutContent(
            state, now, notificationsOn,
            WorkoutActions(
                onClose = { exit = ExitStep.Menu },
                onOpenList = { overlay = Overlay.List },
                onSelectSet = viewModel::onSelectSet,
                onAdjustKg = viewModel::onAdjustKg,
                onEdit = { overlay = Overlay.Edit },
                onConfirm = viewModel::onConfirm,
                onTechnique = { overlay = Overlay.Technique },
                onReplace = { overlay = Overlay.Replace },
                onRestAdjust = viewModel::onRestAdjust,
                onRestTogglePause = viewModel::onRestTogglePause,
                onRestSkip = viewModel::onRestSkip,
                onOpenSettings = {
                    context.startActivity(
                        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
                    )
                },
                onDismissError = viewModel::dismissError,
            ),
        )
    }
    val workout = state.workout ?: return
    val exercise = state.exercise ?: return
    exit?.let { step ->
        ExitMenu(
            step, workout.pendingSets(), onStep = { exit = it },
            onFinish = { exit = null; viewModel.onFinish() },
            onDiscard = { exit = null; viewModel.onDiscard() },
        )
    }
    when (overlay) {
        Overlay.Edit -> ManualEntryDialog(state.load, onDismiss = { overlay = null }) { kg, reps ->
            viewModel.onManualEntry(kg, reps)
            overlay = null
        }
        Overlay.Technique -> ExerciseDetailSheet(
            ExerciseDetail(
                exercise.name, exercise.muscleGroup, exercise.equipment, exercise.videoUrl, exercise.description,
                exercise.sets, exercise.reps, exercise.suggestedKg, null, exercise.restSeconds, null,
            ),
            canOpenVideo = !state.isOffline,
            onDismiss = { overlay = null },
        )
        Overlay.Replace -> ReplaceSheet(state.library, exercise.muscleGroup, exercise.exerciseId, onDismiss = { overlay = null }) {
            viewModel.onReplace(it)
            overlay = null
        }
        Overlay.List -> ExerciseListSheet(workout, onDismiss = { overlay = null }) {
            viewModel.onSelectExercise(it)
            overlay = null
        }
        null -> Unit
    }
}
```

- [ ] **Step 13: Compilar**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL. Si un archivo pasa de 200 líneas, se divide dentro de `ui/workout/components/`. Todavía no hay forma de llegar a la pantalla: eso lo hace la Task 7. No commitear.

---

### Task 7: Entrada desde Hoy, navegación, notificación y logout

**Files:**
- Create: `main/java/com/fittrainer/data/workout/WorkoutLaunchRequests.kt`
- Create: `main/java/com/fittrainer/ui/workout/WorkoutEntryViewModel.kt`
- Create: `main/java/com/fittrainer/ui/workout/components/ActiveWorkoutSignOutDialog.kt`
- Modify: `main/java/com/fittrainer/ui/today/components/RoutineHeroCard.kt`, `ui/today/TodayScreen.kt`, `navigation/RoleTabs.kt`, `navigation/RoleShell.kt`, `MainActivity.kt`
- Test: `test/java/com/fittrainer/ui/workout/WorkoutEntryViewModelTest.kt`

**Interfaces:**
- Consumes:
  - de las Tasks 3 a 6: `WorkoutRepository`, `WorkoutScreen` y `WorkoutNotifications.EXTRA_OPEN_WORKOUT`;
  - código existente: `Routine`, `TodayScreen`/`TodayBody` y `RoleShell`.
- Produces:
  - `WorkoutLaunchRequests` (singleton) con `pending: StateFlow<Boolean>`, `request()` y `consume()`;
  - `WorkoutEntryViewModel` con `hasActive: StateFlow<Boolean>`, `openRequests: StateFlow<Boolean>`, `start(routine, onReady: () -> Unit)`, `finishActive(onDone: () -> Unit)` y `consumeOpenRequest()`;
  - la ruta `WORKOUT_ROUTE = "student/workout"`.

- [ ] **Step 1: Escribir el test que falla** `ui/workout/WorkoutEntryViewModelTest.kt`

```kotlin
package com.fittrainer.ui.workout

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.WorkoutLaunchRequests
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import java.time.Instant
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class WorkoutEntryViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val repo = WorkoutRepository(FakeWorkoutDao(), MutableClock(T0.toEpochMilli())) { "w-1" }
    private val launches = WorkoutLaunchRequests()
    private val vm by lazy { WorkoutEntryViewModel(repo, FakeStudentSession(), launches) }

    private val routine = Routine(
        "rt-1", "Push", null, emptySet(), Instant.EPOCH,
        listOf(RoutineExercise("re-0", "ex-0", "E0", null, null, null, 2, 8, 60, 40.0, null, null)),
    )

    @Test fun `empezar crea la sesion y avisa cuando esta lista`() = runTest {
        var ready = false
        vm.start(routine) { ready = true }

        assertTrue(ready)
        assertTrue(vm.hasActive.value)
    }

    @Test fun `terminar la sesion abierta antes de salir`() = runTest {
        vm.start(routine) {}
        repo.saveSet("u1", 0, 1, Load(40.0, 8))
        var done = false

        vm.finishActive { done = true }

        assertTrue(done)
        assertFalse(vm.hasActive.value)
        assertNull(repo.observeActive("u1").first())
    }

    @Test fun `la notificacion pide abrir la sesion una sola vez`() = runTest {
        launches.request()
        assertTrue(vm.openRequests.value)
        vm.consumeOpenRequest()
        assertEquals(false, vm.openRequests.value)
    }
}
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.WorkoutEntryViewModelTest"`
Expected: FAIL de compilación.

- [ ] **Step 3: Escribir `WorkoutLaunchRequests.kt` y el ViewModel**

```kotlin
package com.fittrainer.data.workout

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** La notificación de la sesión pidió abrirla: MainActivity lo anota y la navegación lo consume. */
@Singleton
class WorkoutLaunchRequests @Inject constructor() {
    private val _pending = MutableStateFlow(false)
    val pending: StateFlow<Boolean> = _pending.asStateFlow()

    fun request() {
        _pending.value = true
    }

    fun consume() {
        _pending.value = false
    }
}
```

`ui/workout/WorkoutEntryViewModel.kt`:

```kotlin
package com.fittrainer.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.routine.Routine
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.WorkoutLaunchRequests
import com.fittrainer.data.workout.WorkoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Entrada a la sesión desde Hoy, desde la notificación y el aviso del logout con sesión abierta. */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class WorkoutEntryViewModel @Inject constructor(
    private val repository: WorkoutRepository,
    sessionRepository: SessionRepository,
    private val launches: WorkoutLaunchRequests,
) : ViewModel() {

    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val hasActive: StateFlow<Boolean> = ownerId.filterNotNull()
        .flatMapLatest { repository.observeActive(it) }
        .map { it != null }
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    val openRequests: StateFlow<Boolean> = launches.pending

    /** "Empezar" o "Continuar sesión": si ya hay una abierta, la continúa (el repo devuelve esa). */
    fun start(routine: Routine, onReady: () -> Unit) {
        val owner = ownerId.value ?: return
        viewModelScope.launch {
            repository.start(owner, routine)
            onReady()
        }
    }

    /** Logout con sesión abierta: se termina (sin series, se descarta) y recién después se sale. */
    fun finishActive(onDone: () -> Unit) {
        val owner = ownerId.value ?: return onDone()
        viewModelScope.launch {
            repository.finish(owner)
            onDone()
        }
    }

    fun consumeOpenRequest() = launches.consume()
}
```

- [ ] **Step 4: Diálogo del logout** `ui/workout/components/ActiveWorkoutSignOutDialog.kt`

```kotlin
package com.fittrainer.ui.workout.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable

/** Spec §4: las sesiones no se borran en el logout; la abierta se termina antes de salir. */
@Composable
fun ActiveWorkoutSignOutDialog(onFinishAndSignOut: () -> Unit, onCancel: () -> Unit) {
    AlertDialog(
        onDismissRequest = onCancel,
        title = { Text("Tenés una sesión en curso") },
        text = { Text("Para cerrar sesión hay que terminarla. Lo que registraste queda guardado.") },
        confirmButton = { TextButton(onClick = onFinishAndSignOut) { Text("Terminarla y salir") } },
        dismissButton = { TextButton(onClick = onCancel) { Text("Cancelar") } },
    )
}
```

- [ ] **Step 5: Correr el test**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.WorkoutEntryViewModelTest"`
Expected: PASS (3 tests).

- [ ] **Step 6: `RoutineHeroCard` habilitado** — reemplazar la firma y el botón:

```kotlin
/** CTA único: "Empezar", o "Continuar sesión" si hay una abierta. Sin ejercicios no se puede empezar. */
@Composable
fun RoutineHeroCard(routine: Routine, workoutActive: Boolean, onStart: () -> Unit) {
```

  En el `Button`:
  - `onClick = onStart`;
  - `enabled = workoutActive || routine.exercises.isNotEmpty()`;
  - texto `if (workoutActive) "Continuar sesión" else "Empezar"`.

  Borrar el `Text("Disponible con el registro de sesiones", …)` de abajo y su comentario viejo.

- [ ] **Step 7: `TodayScreen`** — la firma pasa a ser:

```kotlin
@Composable
fun TodayScreen(
    onOpenWorkout: () -> Unit,
    viewModel: TodayViewModel = hiltViewModel(),
    entry: WorkoutEntryViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val workoutActive by entry.hasActive.collectAsStateWithLifecycle()
    // (LifecycleStartEffect igual que antes)
    TodayBody(
        state,
        workoutActive = workoutActive,
        onStartWorkout = { routine -> entry.start(routine, onOpenWorkout) },
        onRefresh = viewModel::onPullToRefresh,
        onDismissNotice = viewModel::dismissNotice,
    )
}
```

  Además:
  - `TodayBody` suma los parámetros `workoutActive: Boolean, onStartWorkout: (Routine) -> Unit` y se los pasa a `todayItems(...)`;
  - en `todayItems`, `item { RoutineHeroCard(content.routine, workoutActive) { onStartWorkout(content.routine) } }`;
  - imports nuevos: `com.fittrainer.data.routine.Routine` y `com.fittrainer.ui.workout.WorkoutEntryViewModel`.

  El archivo tiene que quedar en 200 líneas o menos (hoy tiene 92).

- [ ] **Step 8: Ruta y navegación**

  En `RoleTabs.kt`, debajo de `STUDENT_LIBRARY_ROUTE`:

```kotlin
/** Sesión activa: pantalla completa, sin la barra de pestañas. */
const val WORKOUT_ROUTE = "student/workout"
```

  En `RoleShell.kt`:
  1. Recibir el VM: `fun RoleShell(tabs: List<Tab>, onSignOut: () -> Unit, entry: WorkoutEntryViewModel = hiltViewModel())`.
  2. La barra de pestañas solo se muestra fuera de la sesión: `bottomBar = { if (currentRoute != WORKOUT_ROUTE) NavigationBar { … } }`.
  3. Hoy navega a la sesión: `tab.route == STUDENT_TODAY_ROUTE -> TodayScreen(onOpenWorkout = { navController.navigate(WORKOUT_ROUTE) { launchSingleTop = true } })`.
  4. Después del `composable(HEALTH_ROUTE)`:

```kotlin
            composable(WORKOUT_ROUTE) {
                WorkoutScreen(onExit = { navController.popBackStack(STUDENT_TODAY_ROUTE, inclusive = false) })
            }
```

  5. Abrir desde la notificación (solo en el shell del alumno) y avisar el logout con sesión abierta. Esto va antes del `Scaffold`:

```kotlin
    val openRequested by entry.openRequests.collectAsStateWithLifecycle()
    val isStudent = tabs.any { it.route == STUDENT_TODAY_ROUTE }
    LaunchedEffect(openRequested) {
        if (openRequested && isStudent && entry.hasActive.value) navController.navigate(WORKOUT_ROUTE) { launchSingleTop = true }
        if (openRequested) entry.consumeOpenRequest()
    }
    var confirmSignOut by remember { mutableStateOf(false) }
    val guardedSignOut: () -> Unit = {
        if (isStudent && entry.hasActive.value) {
            confirmSignOut = true
        } else {
            onSignOut()
        }
    }
    if (confirmSignOut) {
        ActiveWorkoutSignOutDialog(
            onFinishAndSignOut = { confirmSignOut = false; entry.finishActive(onSignOut) },
            onCancel = { confirmSignOut = false },
        )
    }
```

  y `AccountMenuScreen(…, onSignOut = guardedSignOut)`.

  Imports nuevos:
  - `androidx.compose.runtime.LaunchedEffect`, `mutableStateOf`, `remember` y `setValue`;
  - `androidx.hilt.navigation.compose.hiltViewModel` y `androidx.lifecycle.compose.collectAsStateWithLifecycle`;
  - `com.fittrainer.ui.workout.WorkoutEntryViewModel`, `com.fittrainer.ui.workout.WorkoutScreen` y `com.fittrainer.ui.workout.components.ActiveWorkoutSignOutDialog`.

  Si `RoleShell.kt` pasa de 200 líneas, mové el bloque del punto 5 a `navigation/WorkoutShellEffects.kt`.

- [ ] **Step 9: `MainActivity`** — inyectar `@Inject lateinit var workoutLaunch: WorkoutLaunchRequests` y llamar a `handleWorkoutLaunch(intent)` en `onCreate` (dentro de `if (savedInstanceState == null)`) y en `onNewIntent`:

```kotlin
    /** Tocar la notificación de la sesión: abrirla (la navegación lo consume). */
    private fun handleWorkoutLaunch(intent: Intent?) {
        if (intent?.getBooleanExtra(WorkoutNotifications.EXTRA_OPEN_WORKOUT, false) == true) workoutLaunch.request()
    }
```

(imports `com.fittrainer.data.workout.WorkoutLaunchRequests` y `com.fittrainer.ui.workout.service.WorkoutNotifications`).

- [ ] **Step 10: Cerrar la tarea**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL, con todos los tests anteriores en verde. No commitear.

---

### Task 8: Verificación completa y E2E

**Files:** ninguno nuevo (solo arreglos que aparezcan).

- [ ] **Step 1: Suite completa**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest connectedDebugAndroidTest` (con el emulador encendido)
Expected: BUILD SUCCESSFUL, sin fallos en los unitarios ni en los instrumentados.

- [ ] **Step 2: Preparar el E2E**
  - Levantar el backend local en :3001. Si el puerto está ocupado por otro proceso, usar otro puerto con un `mobile/.env` temporal (`API_BASE_URL=http://10.0.2.2:<puerto>/api`) y borrarlo al terminar.
  - Instalar con `./gradlew installDebug`.
  - Entrar con `alumna.card8@test.com` / `Prueba1234`.
  - La rutina "Push E2E" la arma el entrenador `profe.card8@test.com`. Para el paso 1 tiene que tener 5 ejercicios × 4 series. Se carga o edita por la API del backend (`POST/PUT /routines`, con token del entrenador), y que hoy sea uno de sus días.

- [ ] **Step 3: Recorrido (spec §7)**, con capturas en el workspace del plan:
  1. Hoy muestra "Empezar". Al tocarlo se pide el permiso de notificaciones: **Permitir**. Se completa la rutina de 5 × 4 sin salir de la pantalla, el timer arranca solo y al final aparece "Sesión terminada · 20 series · N min".
  2. Nueva sesión: hacer S1, tocar el tab S1, corregir el peso con el lápiz y tocar "Guardar corrección". No arranca el timer y la tab muestra el valor nuevo.
  3. "Reemplazar" en un ejercicio sin series: la hoja abre filtrada por su grupo, se elige otro y el nombre cambia. En un ejercicio con series, el botón queda deshabilitado con el texto.
  4. A mitad de un descanso, cerrar la app desde Recientes y reabrirla: Hoy dice "Continuar sesión" y se retoma el mismo ejercicio y la misma serie, con el descanso recalculado.
  5. ✕ → Descartar → confirmar: se vuelve a Hoy y dice "Empezar".
  6. Arrancar un descanso de 60 s y bloquear el emulador (`adb shell input keyevent 26`). Al terminar aparece la notificación "Descanso terminado" con sonido, y la notificación fija muestra la cuenta regresiva.
  7. Desinstalar, instalar, entrar y **denegar** el permiso: la sesión anda y se ve el aviso de notificaciones.
  8. La pestaña "Mis rutinas" (biblioteca) y el detalle de Hoy siguen igual.
  9. Con una sesión abierta, Perfil → Cerrar sesión: aparece "Tenés una sesión en curso"; "Terminarla y salir" cierra la sesión y vuelve al login.

- [ ] **Step 4: Dejar todo como estaba:** borrar el `mobile/.env` temporal si se creó y correr `./gradlew installDebug` sin él.

- [ ] **Step 5:** el controlador actualiza el ledger. Igna commitea (código, `4.json`, spec y plan).
