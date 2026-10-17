---
tags: [plan]
tarjeta: 8
---
# Rutina del día offline en mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el alumno abra la app (con o sin red) y vea qué le toca hoy, leyendo siempre de Room, con un refresh en segundo plano contra un endpoint nuevo `GET /routines/mine`.

**Architecture:**
- Backend: `GET /api/routines/mine` (solo alumno) devuelve las rutinas activas con `days` y ejercicios. Sigue la cadena ruta → controller → service → repository → model del módulo `routines`.
- Mobile, datos: `RoutineApi` → `RoutineRepository.refresh(ownerId)` reemplaza todo el caché en una transacción de Room. `observeCache(ownerId)` lo expone como dominio puro. El caché tiene dueño (`ownerId`) y se borra al cerrar sesión.
- Mobile, UI: `TodayViewModel` combina el caché, la fecha y la conectividad, y resuelve el estado con la función pura `resolveToday` (Training / Rest / NoRoutine / NeverSynced). Refresca al volver al frente, al recuperar la red y con pull-to-refresh, sin pedidos duplicados.

**Tech Stack:** Node 20 + Express (ESM) + Supabase + Jest; Kotlin 2.2.10, Compose (Material 3 1.3.2 vía BOM 2025.08.00), Hilt 2.57.1, Room 2.7.2, Retrofit 2.11.0 + kotlinx.serialization 1.9.0, Lifecycle 2.9.2.

**Spec:** `docs/superpowers/specs/2026-10-17-rutina-del-dia-design.md`

**Desvíos chicos respecto del spec (decididos al planificar, mismo comportamiento):**
- El filtro del repository del backend (`student_id`, `active`) no tiene test unitario: el backend no testea repositories (no hay mock de Supabase). Se verifica con curl en la Task 9.
- El DAO real se testea en `androidTest` (Room en memoria necesita Android). El repositorio se testea con un DAO falso en memoria, como `HealthRepository`.
- `days` se guarda en Room como texto separado por comas, sin `TypeConverter`.
- `refresh` devuelve `Result<Unit>` con `DataException`, igual que `HealthRepository`, en vez de un `RefreshResult` nuevo.
- Además de borrar el caché al cerrar sesión, el caché guarda su dueño (`ownerId`): si la sesión termina por otra vía (refresh revocado), otro usuario igual no ve la rutina anterior.
- La resolución del día se hace en el ViewModel (con `resolveToday`) y no en el repositorio. Así el día se puede recalcular al pasar la medianoche sin tocar Room.

## Global Constraints

- **Git:** los agentes no commitean ni crean ramas. Los pasos "Commit" y "Rama" los resuelve Igna. Sin firmas de IA.
- **Ramas:** backend en `feature/routines-mine` (sale de `feature/students-body-metrics`); mobile en `feature/android-rutina-del-dia` (sale de `feature/android-onboarding-qr`).
- **Gradle:** se corre desde `mobile/` con el JDK de Android Studio: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew …` (Git Bash).
- **Backend:** se corre desde `backend/`: `npm run lint` (incluye el límite de 200 líneas) y `npm test` (corre con `TZ=UTC`).
- **200 líneas físicas** como máximo por archivo de código (tests incluidos). Orden capa → módulo → archivo.
- **Fronteras de capas:** ningún ViewModel ni Composable importa Retrofit, OkHttp ni Room. La UI lee solo de Room vía repositorio.
- **Endpoint:** `GET routines/mine` (relativo a `…/api/`, sin barra inicial), por el cliente principal (con Bearer y `TokenAuthenticator`).
- **Días del backend:** `monday` … `sunday` en minúscula.
- **Textos de UI (copiados del spec):**
  - "Sin conexión — mostrando tu última rutina"
  - "No pudimos actualizar. Mostrando tu última rutina"
  - "Disponible con el registro de sesiones"
  - "Hoy descansás. Tu próximo entreno es el {día}."
  - "Tu entrenador todavía no te asignó una rutina. Escribile para arrancar."
  - "Conectate una vez para descargar tu rutina."
- **Estimación de minutos:** `sets × (45 s + rest_seconds)` por ejercicio; `rest_seconds` nulo = 60 s, `sets` nulo = 1; redondeo al múltiplo de 5 más cercano.
- **Músculos:** chest → Pecho, back → Espalda, shoulders → Hombros, legs → Piernas, glutes → Glúteos, biceps → Bíceps, triceps → Tríceps, core → Core, calves → Gemelos, full_body → Cuerpo completo, cardio → Cardio; desconocido, tal cual.
- **Estilo:** tema oscuro de `ui/theme` (`FtColors`, `Spacing`, tipografías del tema), toque mínimo `Spacing.minTouchTarget` (44 dp).

## Review Focus

1. **Rutina corta (un ejercicio de una serie):** la tarjeta no puede decir "~0 MIN". Se espera un mínimo de 5 minutos. → test en Task 3.
2. **Rutina activa sin días cargados (`days: []`):** no puede romper ni decir "tu próximo entreno es el null". Se espera "Hoy descansás." a secas. → tests en Tasks 2 y 3.
3. **Ejercicio con datos nulos (sin series, reps, descanso o músculo):** el subtítulo no puede mostrar "null" ni separadores colgando. → test en Task 3.
4. **Otro usuario en el mismo teléfono** (la sesión anterior terminó sin pasar por "Cerrar sesión"): no puede ver la rutina del anterior. Se espera "Conectate una vez…" hasta su primer sync. → test en Task 6.
5. **`created_at` con microsegundos y offset (formato de Supabase), o ilegible:** el orden "gana la más reciente" no puede fallar ni tirar la app. → test en Task 5.

---

### Task 1: Backend — `GET /api/routines/mine`

**Rama (lo resuelve Igna):** `git checkout feature/students-body-metrics && git checkout -b feature/routines-mine`

**Files:**
- Modify: `backend/src/models/routines/routine.model.js` (agregar `toStudentRoutines`)
- Modify: `backend/src/repositories/routines/routines.repository.js` (constante del select con ejercicios + `findActiveRoutinesForStudent`)
- Modify: `backend/src/services/routines/routines.service.js` (`mine`)
- Modify: `backend/src/controllers/routines/routines.controller.js` (`mine`)
- Modify: `backend/src/routes/routines/routines.routes.js` (ruta `/mine`)
- Modify: `backend/tests/helpers/routines/routines-service.setup.js` (mock nuevo)
- Modify: `backend/tests/unit/models/routines/routine.model.test.js`
- Create: `backend/tests/unit/services/routines/routines.service/mine.test.js`
- Modify: `backend/README.md`

**Interfaces:**
- Produces: `GET /api/routines/mine` → `200 { data: [ { routine_id, name, goal, days, created_at, exercises: [ { routine_exercise_id, exercise: { id, name, muscle_group, equipment, video_url }, sets, reps, rest_seconds, suggested_kg, tempo, notes, order_index } ] } ] }`, ordenado por `created_at` descendente. 403 si no es alumno.

- [ ] **Step 1: Test del modelo (falla)**

En `backend/tests/unit/models/routines/routine.model.test.js`, cambiar el import y agregar al final:

```js
import { dayName, toStudentRoutines } from '../../../../src/models/routines/routine.model.js';
```

```js
describe('routine.model · toStudentRoutines', () => {
  const row = {
    id: 'rt-1',
    trainer_id: 'trainer-1',
    student_id: 'st-1',
    name: 'Full body',
    goal: 'strength',
    days: ['monday', 'thursday'],
    active: true,
    created_at: '2026-10-01T10:00:00.123456+00:00',
    routine_exercises: [
      { id: 're-2', order_index: 1, sets: 3, reps: 10, exercise: { id: 'ex-2', name: 'Remo' } },
      { id: 're-1', order_index: 0, sets: 4, reps: 8, exercise: { id: 'ex-1', name: 'Press' } },
    ],
  };

  it('proyecta cada rutina con sus ejercicios ordenados y sin datos internos', () => {
    const [routine] = toStudentRoutines([row]);
    expect(routine).toMatchObject({
      routine_id: 'rt-1',
      name: 'Full body',
      goal: 'strength',
      days: ['monday', 'thursday'],
      created_at: '2026-10-01T10:00:00.123456+00:00',
    });
    expect(routine.exercises.map((e) => e.routine_exercise_id)).toEqual(['re-1', 're-2']);
    expect(routine).not.toHaveProperty('trainer_id');
    expect(routine).not.toHaveProperty('student_id');
  });

  it('sin filas devuelve una lista vacía', () => {
    expect(toStudentRoutines([])).toEqual([]);
    expect(toStudentRoutines(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Test del service (falla)**

En `backend/tests/helpers/routines/routines-service.setup.js`, sumar al objeto `mockRepo` (después de `findActiveRoutineForStudentToday`):

```js
  findActiveRoutinesForStudent: jest.fn(),
```

Crear `backend/tests/unit/services/routines/routines.service/mine.test.js`:

```js
import { mockRepo, service } from '../../../../helpers/routines/routines-service.setup.js';

describe('routines.service · mine', () => {
  it('pide las rutinas activas del alumno logueado', async () => {
    mockRepo.findActiveRoutinesForStudent.mockResolvedValueOnce([]);
    await service.mine('st-1');
    expect(mockRepo.findActiveRoutinesForStudent).toHaveBeenCalledWith('st-1');
  });

  it('sin rutinas activas devuelve []', async () => {
    mockRepo.findActiveRoutinesForStudent.mockResolvedValueOnce([]);
    expect(await service.mine('st-1')).toEqual([]);
  });

  it('devuelve varias rutinas en el orden del repository, con los ejercicios ordenados', async () => {
    mockRepo.findActiveRoutinesForStudent.mockResolvedValueOnce([
      {
        id: 'rt-2',
        name: 'Nueva',
        days: ['tuesday'],
        created_at: '2026-10-10T10:00:00+00:00',
        routine_exercises: [
          { id: 're-b', order_index: 1, exercise: { id: 'ex-2', name: 'Remo' } },
          { id: 're-a', order_index: 0, exercise: { id: 'ex-1', name: 'Press' } },
        ],
      },
      { id: 'rt-1', name: 'Vieja', days: ['monday'], created_at: '2026-10-01T10:00:00+00:00' },
    ]);

    const result = await service.mine('st-1');

    expect(result.map((r) => r.routine_id)).toEqual(['rt-2', 'rt-1']);
    expect(result[0].exercises.map((e) => e.exercise.name)).toEqual(['Press', 'Remo']);
    expect(result[1].exercises).toEqual([]);
  });
});
```

- [ ] **Step 3: Correr y ver que fallan**

Run: `cd backend && npm test -- routine.model mine`
Expected: FAIL (`toStudentRoutines` no existe; `service.mine is not a function`).

- [ ] **Step 4: Modelo**

En `backend/src/models/routines/routine.model.js`, agregar al final:

```js
/**
 * Proyección para GET /routines/mine: las rutinas activas del alumno con sus
 * ejercicios, para el caché offline de mobile (que resuelve el día en el teléfono).
 */
export function toStudentRoutines(rows) {
  return (rows ?? []).map((row) => ({
    routine_id: row.id,
    name: row.name,
    goal: row.goal,
    days: row.days,
    created_at: row.created_at,
    exercises: mapRoutineExercises(row.routine_exercises),
  }));
}
```

- [ ] **Step 5: Repository**

En `backend/src/repositories/routines/routines.repository.js`, debajo de `const TEMPLATES_TABLE = 'routine_templates';`:

```js
// Rutina con sus ejercicios embebidos (y los datos del ejercicio para mostrarlo).
const ROUTINE_WITH_EXERCISES =
  `${ROUTINE_COLUMNS}, routine_exercises ( ${ROUTINE_EXERCISE_COLUMNS}, ` +
  `exercise:exercise_id ( id, name, muscle_group, equipment, video_url ) )`;
```

En `findRoutineByIdWithExercises` y en `findActiveRoutineForStudentToday`, reemplazar el argumento de `.select(...)` (las dos líneas con el template) por `.select(ROUTINE_WITH_EXERCISES)`.

Agregar al final:

```js
/** Rutinas activas del alumno con sus ejercicios, la más nueva primero (GET /routines/mine). */
export async function findActiveRoutinesForStudent(studentId) {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .select(ROUTINE_WITH_EXERCISES)
    .eq('student_id', studentId)
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw Errors.internal(error.message);
  return data;
}
```

- [ ] **Step 6: Service, controller y ruta**

En `backend/src/services/routines/routines.service.js`, sumar `toStudentRoutines` al import del modelo y agregar al final:

```js
/** Rutinas activas del alumno con sus ejercicios (caché offline de mobile). */
export async function mine(studentId) {
  return toStudentRoutines(await repository.findActiveRoutinesForStudent(studentId));
}
```

En `backend/src/controllers/routines/routines.controller.js`, agregar al final:

```js
/** GET /routines/mine — rutinas activas del alumno con sus ejercicios (solo alumnos). */
export const mine = asyncHandler(async (req, res) => {
  const data = await routinesService.mine(req.user.id);
  res.json({ data });
});
```

En `backend/src/routes/routines/routines.routes.js`, debajo de la ruta `/today` (antes de cualquier ruta con `/:id`):

```js
router.get('/mine', requireRole('student'), routinesController.mine);
```

- [ ] **Step 7: Correr los tests y el lint**

Run: `cd backend && npm test && npm run lint`
Expected: todo en verde; ningún archivo pasa de 200 líneas.

- [ ] **Step 8: README (aviso a Pablo)**

En `backend/README.md`, en la tabla "### Rutinas — Fase 2", debajo de la fila de `/api/routines/today`:

```md
| GET | `/api/routines/mine` | student | Rutinas activas del alumno con sus ejercicios (caché offline de mobile) |
```

En "## Desvíos respecto del contrato de API (Notion v1.1)", antes de "### Lo que le toca a la web":

```md
### Rutinas (`/routines`)

- **Nuevo `GET /routines/mine`** (solo alumno): devuelve `{ data: [...] }` con **todas** las rutinas activas del alumno, cada una con `routine_id`, `name`, `goal`, `days`, `created_at` y `exercises` (la misma forma que en `/today`, sin `last_session_kg`), la más nueva primero; `[]` si no tiene. Lo usa la app mobile para guardar la rutina offline y resolver el día en el teléfono: `/today` no distingue "día de descanso" de "sin rutina" y no sirve para un caché que se usa otro día.
- `GET /routines/today` no cambia.
```

Y al final de la lista "### Lo que le toca a la web":

```md
- **Rutinas:** nada. `GET /routines/mine` es solo para mobile.
```

- [ ] **Step 9: Commit** (lo resuelve Igna)

```bash
git add backend/src backend/tests backend/README.md
git commit -m "feat(routines): GET /routines/mine con las rutinas activas del alumno para el caché offline de mobile"
```

---

### Task 2: Mobile — dominio de rutinas y resolución del día

**Rama (lo resuelve Igna):** `git checkout feature/android-onboarding-qr && git checkout -b feature/android-rutina-del-dia`

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/routine/Routine.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/routine/TodayResolver.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/routine/TodayResolverTest.kt`

**Interfaces:**
- Produces:
  - `data class Routine(id: String, name: String, goal: String?, days: Set<DayOfWeek>, createdAt: Instant, exercises: List<RoutineExercise>)`
  - `data class RoutineExercise(id: String, exerciseId: String, name: String, muscleGroup: String?, equipment: String?, videoUrl: String?, sets: Int?, reps: Int?, restSeconds: Int?, suggestedKg: Double?, tempo: String?, notes: String?)`
  - `data class RoutineCache(routines: List<Routine>, lastSyncedAt: Instant?)`
  - `sealed interface TodayContent { Training(routine), Rest(routine, nextDay: DayOfWeek?), NoRoutine, NeverSynced }`
  - `fun resolveToday(routines: List<Routine>, date: LocalDate, everSynced: Boolean): TodayContent`
  - `fun nextTrainingDay(routines: List<Routine>, from: DayOfWeek): DayOfWeek?`
  - `fun parseDays(raw: List<String>): Set<DayOfWeek>`

- [ ] **Step 1: Test (falla)**

`mobile/app/src/test/java/com/fittrainer/data/routine/TodayResolverTest.kt`:

```kotlin
package com.fittrainer.data.routine

import java.time.DayOfWeek
import java.time.DayOfWeek.FRIDAY
import java.time.DayOfWeek.MONDAY
import java.time.DayOfWeek.THURSDAY
import java.time.DayOfWeek.TUESDAY
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class TodayResolverTest {

    private val monday = LocalDate.of(2026, 10, 19)
    private val saturday = LocalDate.of(2026, 10, 24)

    private fun routine(id: String, days: Set<DayOfWeek>, createdAt: Long = 0L) =
        Routine(id, "Rutina $id", null, days, Instant.ofEpochMilli(createdAt), emptyList())

    @Test fun `las fechas de prueba son lunes y sabado`() {
        assertEquals(MONDAY, monday.dayOfWeek)
        assertEquals(DayOfWeek.SATURDAY, saturday.dayOfWeek)
    }

    @Test fun `nunca sincronizo es NeverSynced`() {
        assertEquals(TodayContent.NeverSynced, resolveToday(emptyList(), monday, everSynced = false))
    }

    @Test fun `sincronizado sin rutinas es NoRoutine`() {
        assertEquals(TodayContent.NoRoutine, resolveToday(emptyList(), monday, everSynced = true))
    }

    @Test fun `hoy toca entrenar devuelve Training`() {
        val push = routine("push", setOf(MONDAY, THURSDAY))
        assertEquals(TodayContent.Training(push), resolveToday(listOf(push), monday, everSynced = true))
    }

    @Test fun `empate de dias gana la rutina mas reciente`() {
        val vieja = routine("vieja", setOf(MONDAY), createdAt = 1_000L)
        val nueva = routine("nueva", setOf(MONDAY), createdAt = 2_000L)
        assertEquals(TodayContent.Training(nueva), resolveToday(listOf(vieja, nueva), monday, everSynced = true))
    }

    @Test fun `hoy no toca devuelve Rest con el proximo dia`() {
        val r = routine("r", setOf(THURSDAY))
        assertEquals(TodayContent.Rest(r, THURSDAY), resolveToday(listOf(r), monday, everSynced = true))
    }

    @Test fun `el proximo dia cruza el domingo`() {
        val r = routine("r", setOf(TUESDAY))
        assertEquals(TodayContent.Rest(r, TUESDAY), resolveToday(listOf(r), saturday, everSynced = true))
    }

    @Test fun `el proximo dia mira todas las rutinas y Rest muestra la mas reciente`() {
        val vieja = routine("vieja", setOf(TUESDAY), createdAt = 1_000L)
        val nueva = routine("nueva", setOf(FRIDAY), createdAt = 2_000L)
        assertEquals(TodayContent.Rest(nueva, TUESDAY), resolveToday(listOf(vieja, nueva), monday, everSynced = true))
    }

    // Review Focus 2: rutina activa sin días cargados.
    @Test fun `rutina sin dias es Rest sin proximo dia`() {
        val r = routine("r", emptySet())
        assertEquals(TodayContent.Rest(r, null), resolveToday(listOf(r), monday, everSynced = true))
    }

    @Test fun `parseDays ignora mayusculas, espacios y valores desconocidos`() {
        assertEquals(setOf(MONDAY, FRIDAY), parseDays(listOf("monday", "FRIDAY ", "funday", "")))
    }
}
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.routine.TodayResolverTest"`
Expected: FAIL de compilación (`Routine`, `resolveToday` no existen).

- [ ] **Step 3: Dominio**

`mobile/app/src/main/java/com/fittrainer/data/routine/Routine.kt`:

```kotlin
package com.fittrainer.data.routine

import java.time.DayOfWeek
import java.time.Instant

/** Rutina activa del alumno, tal como la ve la app (sin nada de Retrofit ni Room). */
data class Routine(
    val id: String,
    val name: String,
    val goal: String?,
    val days: Set<DayOfWeek>,
    val createdAt: Instant,
    val exercises: List<RoutineExercise>,
)

/** Un ejercicio de la rutina. La lista ya viene ordenada por el orden que puso el entrenador. */
data class RoutineExercise(
    val id: String,
    val exerciseId: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val videoUrl: String?,
    val sets: Int?,
    val reps: Int?,
    val restSeconds: Int?,
    val suggestedKg: Double?,
    val tempo: String?,
    val notes: String?,
)

/** Caché de un alumno. lastSyncedAt == null: nunca sincronizó (o lo guardado es de otro usuario). */
data class RoutineCache(val routines: List<Routine>, val lastSyncedAt: Instant?)

/** Qué muestra la pantalla "Hoy". */
sealed interface TodayContent {
    data class Training(val routine: Routine) : TodayContent

    /** Tiene rutina pero hoy no le toca. nextDay == null si ninguna rutina tiene días cargados. */
    data class Rest(val routine: Routine, val nextDay: DayOfWeek?) : TodayContent

    data object NoRoutine : TodayContent

    data object NeverSynced : TodayContent
}
```

- [ ] **Step 4: Resolución**

`mobile/app/src/main/java/com/fittrainer/data/routine/TodayResolver.kt`:

```kotlin
package com.fittrainer.data.routine

import java.time.DayOfWeek
import java.time.LocalDate

/**
 * Qué toca hoy, con la misma regla que el backend en /routines/today: entre las rutinas activas
 * cuyo days incluye el día, la creada más recientemente.
 */
fun resolveToday(routines: List<Routine>, date: LocalDate, everSynced: Boolean): TodayContent {
    if (!everSynced) return TodayContent.NeverSynced
    if (routines.isEmpty()) return TodayContent.NoRoutine
    val newestFirst = routines.sortedByDescending { it.createdAt }
    val today = date.dayOfWeek
    newestFirst.firstOrNull { today in it.days }?.let { return TodayContent.Training(it) }
    return TodayContent.Rest(newestFirst.first(), nextTrainingDay(routines, today))
}

/** Próximo día (de mañana a dentro de una semana) en que alguna rutina tiene entrenamiento. */
fun nextTrainingDay(routines: List<Routine>, from: DayOfWeek): DayOfWeek? =
    (1L..7L).map { from.plus(it) }.firstOrNull { day -> routines.any { day in it.days } }

/** Días del backend (monday … sunday) a DayOfWeek. Los valores desconocidos se ignoran. */
fun parseDays(raw: List<String>): Set<DayOfWeek> = raw.mapNotNull { name ->
    DayOfWeek.values().firstOrNull { it.name.equals(name.trim(), ignoreCase = true) }
}.toSet()
```

- [ ] **Step 5: Correr y ver que pasa**

Run: el mismo comando del Step 2.
Expected: PASS (10 tests).

- [ ] **Step 6: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src/main/java/com/fittrainer/data/routine mobile/app/src/test/java/com/fittrainer/data/routine
git commit -m "feat(mobile): dominio de rutinas y resolución del día en el teléfono"
```

---

### Task 3: Mobile — textos derivados de la rutina

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/RoutineTexts.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/today/RoutineTextsTest.kt`

**Interfaces:**
- Consumes: `Routine`, `RoutineExercise` (Task 2).
- Produces (funciones puras, paquete `com.fittrainer.ui.today`): `dayName(DayOfWeek): String`, `dayInitial(DayOfWeek): String`, `headerDate(LocalDate): String`, `muscleLabel(String?): String`, `setsReps(RoutineExercise): String`, `exerciseSubtitle(RoutineExercise): String`, `totalSets(List<RoutineExercise>): Int`, `estimatedMinutes(List<RoutineExercise>): Int`, `heroSummary(Routine): String`, `restMessage(DayOfWeek?): String`, `formatKg(Double): String`.

- [ ] **Step 1: Test (falla)**

`mobile/app/src/test/java/com/fittrainer/ui/today/RoutineTextsTest.kt`:

```kotlin
package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class RoutineTextsTest {

    private fun exercise(sets: Int? = 4, reps: Int? = 8, rest: Int? = 90, muscle: String? = "chest") =
        RoutineExercise("re", "ex", "Press", muscle, null, null, sets, reps, rest, null, null, null)

    @Test fun `fecha del encabezado en mayusculas y sin locale`() {
        assertEquals("SÁBADO · 17 OCT", headerDate(LocalDate.of(2026, 10, 17)))
        assertEquals("MIÉRCOLES · 2 DIC", headerDate(LocalDate.of(2026, 12, 2)))
    }

    @Test fun `iniciales de la semana`() {
        assertEquals("LMXJVSD", DayOfWeek.values().joinToString("") { dayInitial(it) })
    }

    @Test fun `musculos traducidos y desconocido tal cual`() {
        assertEquals("Pecho", muscleLabel("chest"))
        assertEquals("Cuerpo completo", muscleLabel("full_body"))
        assertEquals("pantorrilla", muscleLabel("pantorrilla"))
        assertEquals("", muscleLabel(null))
    }

    @Test fun `series por reps y casos sin datos`() {
        assertEquals("4×8", setsReps(exercise()))
        assertEquals("3 series", setsReps(exercise(sets = 3, reps = null)))
        assertEquals("1 serie", setsReps(exercise(sets = 1, reps = null)))
        assertEquals("12 reps", setsReps(exercise(sets = null, reps = 12)))
        assertEquals("", setsReps(exercise(sets = null, reps = null)))
    }

    // Review Focus 3: sin "null" ni separadores colgando.
    @Test fun `subtitulo del ejercicio con datos faltantes`() {
        assertEquals("4×8 · Pecho", exerciseSubtitle(exercise()))
        assertEquals("Pecho", exerciseSubtitle(exercise(sets = null, reps = null)))
        assertEquals("4×8", exerciseSubtitle(exercise(muscle = null)))
        assertEquals("", exerciseSubtitle(exercise(sets = null, reps = null, muscle = null)))
    }

    @Test fun `series totales cuentan los nulos como cero`() {
        assertEquals(7, totalSets(listOf(exercise(sets = 4), exercise(sets = 3), exercise(sets = null))))
    }

    @Test fun `minutos estimados redondeados a 5`() {
        // 3 ejercicios × 4 series × (45 + 90) s = 1620 s = 27 min → 25
        assertEquals(25, estimatedMinutes(List(3) { exercise(sets = 4, rest = 90) }))
        // 4 × (45 + 60 por defecto) = 420 s = 7 min → 5
        assertEquals(5, estimatedMinutes(listOf(exercise(sets = 4, rest = null))))
        assertEquals(0, estimatedMinutes(emptyList()))
    }

    // Review Focus 1: una rutina corta no dice "~0 MIN".
    @Test fun `rutina muy corta estima al menos 5 minutos`() {
        assertEquals(5, estimatedMinutes(listOf(exercise(sets = null, rest = 30))))
    }

    @Test fun `resumen de la tarjeta con plurales`() {
        val routine = Routine("r", "Push", null, emptySet(), Instant.EPOCH, listOf(exercise(sets = 1, rest = 60)))
        assertEquals("1 EJERCICIO · ~5 MIN · 1 SERIE", heroSummary(routine))
        val two = routine.copy(exercises = List(2) { exercise(sets = 4, rest = 90) })
        assertEquals("2 EJERCICIOS · ~20 MIN · 8 SERIES", heroSummary(two))
    }

    // Review Focus 2: sin próximo día, sin "null".
    @Test fun `mensaje de descanso con y sin proximo dia`() {
        assertEquals("Hoy descansás. Tu próximo entreno es el jueves.", restMessage(DayOfWeek.THURSDAY))
        assertEquals("Hoy descansás.", restMessage(null))
    }

    @Test fun `kilos sin decimales de mas`() {
        assertEquals("40 kg", formatKg(40.0))
        assertEquals("2.5 kg", formatKg(2.5))
    }
}
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.today.RoutineTextsTest"`
Expected: FAIL de compilación.

- [ ] **Step 3: Implementación**

`mobile/app/src/main/java/com/fittrainer/ui/today/RoutineTexts.kt`:

```kotlin
package com.fittrainer.ui.today

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import java.time.DayOfWeek
import java.time.LocalDate
import kotlin.math.roundToInt

/** Segundos de trabajo por serie para estimar la duración (el backend no lo informa). */
private const val WORK_SECONDS_PER_SET = 45
private const val DEFAULT_REST_SECONDS = 60
private const val MINUTES_STEP = 5

private val DAY_NAMES = mapOf(
    DayOfWeek.MONDAY to "lunes",
    DayOfWeek.TUESDAY to "martes",
    DayOfWeek.WEDNESDAY to "miércoles",
    DayOfWeek.THURSDAY to "jueves",
    DayOfWeek.FRIDAY to "viernes",
    DayOfWeek.SATURDAY to "sábado",
    DayOfWeek.SUNDAY to "domingo",
)

private val DAY_INITIALS = mapOf(
    DayOfWeek.MONDAY to "L",
    DayOfWeek.TUESDAY to "M",
    DayOfWeek.WEDNESDAY to "X",
    DayOfWeek.THURSDAY to "J",
    DayOfWeek.FRIDAY to "V",
    DayOfWeek.SATURDAY to "S",
    DayOfWeek.SUNDAY to "D",
)

private val MONTHS = listOf("ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC")

private val MUSCLES = mapOf(
    "chest" to "Pecho",
    "back" to "Espalda",
    "shoulders" to "Hombros",
    "legs" to "Piernas",
    "glutes" to "Glúteos",
    "biceps" to "Bíceps",
    "triceps" to "Tríceps",
    "core" to "Core",
    "calves" to "Gemelos",
    "full_body" to "Cuerpo completo",
    "cardio" to "Cardio",
)

fun dayName(day: DayOfWeek): String = DAY_NAMES.getValue(day)

fun dayInitial(day: DayOfWeek): String = DAY_INITIALS.getValue(day)

/** "SÁBADO · 17 OCT". Sin Locale: el resultado no depende del idioma del teléfono. */
fun headerDate(date: LocalDate): String =
    "${dayName(date.dayOfWeek).uppercase()} · ${date.dayOfMonth} ${MONTHS[date.monthValue - 1]}"

fun muscleLabel(raw: String?): String = raw?.let { MUSCLES[it] ?: it }.orEmpty()

/** "4×8"; sin reps, "3 series"; sin series, "12 reps"; sin nada, "". */
fun setsReps(exercise: RoutineExercise): String {
    val sets = exercise.sets
    val reps = exercise.reps
    return when {
        sets != null && reps != null -> "$sets×$reps"
        sets != null -> plural(sets, "serie", "series")
        reps != null -> "$reps reps"
        else -> ""
    }
}

/** "4×8 · Pecho", sin separadores colgando si falta algo. */
fun exerciseSubtitle(exercise: RoutineExercise): String =
    listOf(setsReps(exercise), muscleLabel(exercise.muscleGroup)).filter { it.isNotBlank() }.joinToString(" · ")

fun totalSets(exercises: List<RoutineExercise>): Int = exercises.sumOf { it.sets ?: 0 }

/** Minutos estimados, redondeados a múltiplos de 5 y nunca menos de 5 si hay ejercicios. */
fun estimatedMinutes(exercises: List<RoutineExercise>): Int {
    if (exercises.isEmpty()) return 0
    val seconds = exercises.sumOf {
        (it.sets ?: 1) * (WORK_SECONDS_PER_SET + (it.restSeconds ?: DEFAULT_REST_SECONDS))
    }
    val rounded = (seconds / 60.0 / MINUTES_STEP).roundToInt() * MINUTES_STEP
    return maxOf(MINUTES_STEP, rounded)
}

/** "6 EJERCICIOS · ~55 MIN · 18 SERIES" */
fun heroSummary(routine: Routine): String = listOf(
    plural(routine.exercises.size, "EJERCICIO", "EJERCICIOS"),
    "~${estimatedMinutes(routine.exercises)} MIN",
    plural(totalSets(routine.exercises), "SERIE", "SERIES"),
).joinToString(" · ")

fun restMessage(nextDay: DayOfWeek?): String =
    nextDay?.let { "Hoy descansás. Tu próximo entreno es el ${dayName(it)}." } ?: "Hoy descansás."

/** 40.0 → "40 kg"; 2.5 → "2.5 kg". */
fun formatKg(kg: Double): String = if (kg % 1.0 == 0.0) "${kg.toInt()} kg" else "$kg kg"

private fun plural(n: Int, one: String, many: String) = "$n ${if (n == 1) one else many}"
```

- [ ] **Step 4: Correr y ver que pasa**

Run: el mismo comando del Step 2.
Expected: PASS (11 tests).

- [ ] **Step 5: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src/main/java/com/fittrainer/ui/today/RoutineTexts.kt mobile/app/src/test/java/com/fittrainer/ui/today
git commit -m "feat(mobile): textos de la rutina del día (minutos, series, músculos, fecha)"
```

---

### Task 4: Mobile — Room versión 2 con el caché de rutinas

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/db/routine/RoutineEntities.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/db/routine/RoutineDao.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/db/FitTrainerDatabase.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/di/DatabaseModule.kt`
- Test (instrumentado): `mobile/app/src/androidTest/java/com/fittrainer/data/db/routine/RoutineDaoTest.kt`
- Generado por el build: `mobile/app/schemas/com.fittrainer.data.db.FitTrainerDatabase/2.json` (se commitea)

**Interfaces:**
- Produces:
  - `RoutineEntity(id: String, name: String, goal: String?, days: String, createdAt: Long)` — tabla `routines`
  - `RoutineExerciseEntity(id, routineId, exerciseId, name, muscleGroup?, equipment?, videoUrl?, sets: Int?, reps: Int?, restSeconds: Int?, suggestedKg: Double?, tempo?, notes?, orderIndex: Int)` — tabla `routine_exercises`
  - `RoutineSyncEntity(id: Int = 0, ownerId: String, lastSyncedAt: Long)` — tabla `routine_sync`
  - `RoutineWithExercises(routine: RoutineEntity, exercises: List<RoutineExerciseEntity>)`
  - `abstract class RoutineDao` con `observeRoutines(): Flow<List<RoutineWithExercises>>`, `observeSync(): Flow<RoutineSyncEntity?>`, `replaceAll(sync, routines, exercises)`, `clear()`, y las primitivas abstractas `insertRoutines`, `insertExercises`, `upsertSync`, `deleteExercises`, `deleteRoutines`, `deleteSync` (públicas, para que el DAO falso de la Task 6 las implemente).
  - `FitTrainerDatabase.routineDao()`; Hilt provee `RoutineDao`.

- [ ] **Step 1: Test instrumentado (falla)**

`mobile/app/src/androidTest/java/com/fittrainer/data/db/routine/RoutineDaoTest.kt`:

```kotlin
package com.fittrainer.data.db.routine

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
class RoutineDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: RoutineDao

    private fun routine(id: String) = RoutineEntity(id, "Rutina $id", null, "monday,thursday", 1L)

    private fun exercise(id: String, routineId: String, order: Int = 0) = RoutineExerciseEntity(
        id = id, routineId = routineId, exerciseId = "ex-$id", name = "Press", muscleGroup = "chest",
        equipment = null, videoUrl = null, sets = 4, reps = 8, restSeconds = 90, suggestedKg = 40.0,
        tempo = null, notes = null, orderIndex = order,
    )

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java,
        ).build()
        dao = db.routineDao()
    }

    @After fun tearDown() = db.close()

    @Test fun sinDatosNoHayRutinasNiSync() = runTest {
        assertTrue(dao.observeRoutines().first().isEmpty())
        assertNull(dao.observeSync().first())
    }

    @Test fun replaceAllGuardaRutinasConSusEjerciciosYElDuenio() = runTest {
        val sync = RoutineSyncEntity(ownerId = "u1", lastSyncedAt = 5L)
        dao.replaceAll(sync, listOf(routine("rt-1")), listOf(exercise("re-1", "rt-1"), exercise("re-2", "rt-1", 1)))

        val rows = dao.observeRoutines().first()
        assertEquals(listOf("rt-1"), rows.map { it.routine.id })
        assertEquals(setOf("re-1", "re-2"), rows.single().exercises.map { it.id }.toSet())
        assertEquals(sync, dao.observeSync().first())
    }

    @Test fun replaceAllBorraLoAnterior() = runTest {
        dao.replaceAll(RoutineSyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(routine("rt-1")), listOf(exercise("re-1", "rt-1")))
        dao.replaceAll(RoutineSyncEntity(ownerId = "u1", lastSyncedAt = 2L), listOf(routine("rt-2")), listOf(exercise("re-9", "rt-2")))

        val rows = dao.observeRoutines().first()
        assertEquals(listOf("rt-2"), rows.map { it.routine.id })
        assertEquals(listOf("re-9"), rows.single().exercises.map { it.id })
        assertEquals(2L, dao.observeSync().first()?.lastSyncedAt)
    }

    @Test fun clearDejaTodoVacio() = runTest {
        dao.replaceAll(RoutineSyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(routine("rt-1")), listOf(exercise("re-1", "rt-1")))
        dao.clear()
        assertTrue(dao.observeRoutines().first().isEmpty())
        assertNull(dao.observeSync().first())
    }
}
```

- [ ] **Step 2: Entidades**

`mobile/app/src/main/java/com/fittrainer/data/db/routine/RoutineEntities.kt`:

```kotlin
package com.fittrainer.data.db.routine

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation

/** Rutina activa del alumno. */
@Entity(tableName = "routines")
data class RoutineEntity(
    @PrimaryKey val id: String,
    val name: String,
    val goal: String?,
    /** Días tal como vienen del backend, separados por coma ("monday,thursday"). */
    val days: String,
    /** created_at del backend en epoch millis (0 si no se pudo leer: queda como la más vieja). */
    val createdAt: Long,
)

/** Ejercicio de una rutina, con los datos del ejercicio copiados en la fila. */
@Entity(
    tableName = "routine_exercises",
    foreignKeys = [
        ForeignKey(
            entity = RoutineEntity::class,
            parentColumns = ["id"],
            childColumns = ["routineId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("routineId")],
)
data class RoutineExerciseEntity(
    @PrimaryKey val id: String,
    val routineId: String,
    val exerciseId: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val videoUrl: String?,
    val sets: Int?,
    val reps: Int?,
    val restSeconds: Int?,
    val suggestedKg: Double?,
    val tempo: String?,
    val notes: String?,
    val orderIndex: Int,
)

/** Última sincronización buena. Una sola fila (id = 0). ownerId = alumno dueño del caché. */
@Entity(tableName = "routine_sync")
data class RoutineSyncEntity(
    @PrimaryKey val id: Int = 0,
    val ownerId: String,
    val lastSyncedAt: Long,
)

data class RoutineWithExercises(
    @Embedded val routine: RoutineEntity,
    @Relation(parentColumn = "id", entityColumn = "routineId")
    val exercises: List<RoutineExerciseEntity>,
)
```

- [ ] **Step 3: DAO**

`mobile/app/src/main/java/com/fittrainer/data/db/routine/RoutineDao.kt`:

```kotlin
package com.fittrainer.data.db.routine

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * Caché de rutinas. Se reemplaza entero en cada sync: así una rutina que el entrenador
 * desactivó o borró desaparece del teléfono.
 */
@Dao
abstract class RoutineDao {

    @Transaction
    @Query("SELECT * FROM routines")
    abstract fun observeRoutines(): Flow<List<RoutineWithExercises>>

    @Query("SELECT * FROM routine_sync WHERE id = 0")
    abstract fun observeSync(): Flow<RoutineSyncEntity?>

    @Insert
    abstract suspend fun insertRoutines(routines: List<RoutineEntity>)

    @Insert
    abstract suspend fun insertExercises(exercises: List<RoutineExerciseEntity>)

    @Upsert
    abstract suspend fun upsertSync(sync: RoutineSyncEntity)

    @Query("DELETE FROM routine_exercises")
    abstract suspend fun deleteExercises()

    @Query("DELETE FROM routines")
    abstract suspend fun deleteRoutines()

    @Query("DELETE FROM routine_sync")
    abstract suspend fun deleteSync()

    /** Todo o nada: si algo falla a mitad de camino, queda el caché anterior. */
    @Transaction
    open suspend fun replaceAll(
        sync: RoutineSyncEntity,
        routines: List<RoutineEntity>,
        exercises: List<RoutineExerciseEntity>,
    ) {
        deleteExercises()
        deleteRoutines()
        insertRoutines(routines)
        insertExercises(exercises)
        upsertSync(sync)
    }

    @Transaction
    open suspend fun clear() {
        deleteExercises()
        deleteRoutines()
        deleteSync()
    }
}
```

- [ ] **Step 4: Base de datos y DI**

`mobile/app/src/main/java/com/fittrainer/data/db/FitTrainerDatabase.kt` queda:

```kotlin
package com.fittrainer.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.fittrainer.data.db.routine.RoutineDao
import com.fittrainer.data.db.routine.RoutineEntity
import com.fittrainer.data.db.routine.RoutineExerciseEntity
import com.fittrainer.data.db.routine.RoutineSyncEntity

@Database(
    entities = [
        HealthSnapshotEntity::class,
        RoutineEntity::class,
        RoutineExerciseEntity::class,
        RoutineSyncEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
abstract class FitTrainerDatabase : RoomDatabase() {
    abstract fun healthDao(): HealthDao
    abstract fun routineDao(): RoutineDao
}
```

En `mobile/app/src/main/java/com/fittrainer/di/DatabaseModule.kt`, el builder queda (todo es caché y todavía no hay usuarios reales; las migraciones de verdad llegan con la cola offline del S3):

```kotlin
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): FitTrainerDatabase =
        Room.databaseBuilder(context, FitTrainerDatabase::class.java, "fittrainer.db")
            // v1 → v2 solo agrega cachés: se pueden tirar y se vuelven a bajar.
            .fallbackToDestructiveMigration(dropAllTables = true)
            .build()
```

y se agrega (con su import `com.fittrainer.data.db.routine.RoutineDao`):

```kotlin
    @Provides
    fun provideRoutineDao(db: FitTrainerDatabase): RoutineDao = db.routineDao()
```

- [ ] **Step 5: Compilar (genera el schema 2) y correr el test instrumentado**

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew checkFileLength assembleDebug`
Expected: BUILD SUCCESSFUL y existe `app/schemas/com.fittrainer.data.db.FitTrainerDatabase/2.json`.

Con el emulador prendido:
Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.fittrainer.data.db.routine.RoutineDaoTest`
Expected: 4 tests PASS.

- [ ] **Step 6: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src/main/java/com/fittrainer/data/db mobile/app/src/main/java/com/fittrainer/di/DatabaseModule.kt mobile/app/src/androidTest mobile/app/schemas
git commit -m "feat(mobile): Room v2 con el caché de rutinas (reemplazo atómico y dueño)"
```

---

### Task 5: Mobile — API de rutinas, mapeo y conectividad

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/api/RoutineApi.kt` (interfaz + DTOs)
- Create: `mobile/app/src/main/java/com/fittrainer/data/routine/RoutineMapper.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/network/ConnectivityObserver.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/di/RoutineModule.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/di/NetworkModule.kt`
- Modify: `mobile/app/src/main/AndroidManifest.xml`
- Test: `mobile/app/src/test/java/com/fittrainer/data/routine/RoutineMapperTest.kt`

**Interfaces:**
- Consumes: entidades y `RoutineWithExercises` (Task 4); `Routine`, `RoutineExercise`, `parseDays` (Task 2).
- Produces:
  - `interface RoutineApi { suspend fun mine(): MineResponse }`
  - DTOs `MineResponse(data: List<StudentRoutineDto>)`, `StudentRoutineDto(routineId, name, goal?, days: List<String>, createdAt: String?, exercises: List<RoutineExerciseDto>)`, `RoutineExerciseDto(id, exercise: ExerciseDto?, sets?, reps?, restSeconds?, suggestedKg: Double?, tempo?, notes?, orderIndex: Int)`, `ExerciseDto(id, name, muscleGroup?, equipment?, videoUrl?)`
  - `StudentRoutineDto.toEntity(): RoutineEntity`, `StudentRoutineDto.toExerciseEntities(): List<RoutineExerciseEntity>`, `RoutineWithExercises.toDomain(): Routine`, `parseCreatedAt(String?): Long`
  - `interface ConnectivityObserver { val isOnline: Flow<Boolean> }` + `AndroidConnectivityObserver`, ligado por Hilt en `RoutineModule`.

- [ ] **Step 1: Test del mapeo (falla)**

`mobile/app/src/test/java/com/fittrainer/data/routine/RoutineMapperTest.kt`:

```kotlin
package com.fittrainer.data.routine

import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.db.routine.RoutineEntity
import com.fittrainer.data.db.routine.RoutineExerciseEntity
import com.fittrainer.data.db.routine.RoutineWithExercises
import java.time.DayOfWeek
import java.time.Instant
import java.time.OffsetDateTime
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test

class RoutineMapperTest {

    private val json = Json { ignoreUnknownKeys = true }

    // Forma real de GET /routines/mine, con un campo que mobile no usa y un ejercicio sin datos.
    private val payload = """
        {"data":[{"routine_id":"rt-1","name":"Push","goal":"hypertrophy","days":["monday","thursday"],
          "created_at":"2026-10-17T03:00:00.123456+00:00","extra":true,
          "exercises":[
            {"routine_exercise_id":"re-2","order_index":1,"sets":3,"reps":12,"rest_seconds":60,
             "suggested_kg":2.5,"tempo":null,"notes":"Controlá la bajada",
             "exercise":{"id":"ex-2","name":"Aperturas","muscle_group":"chest","equipment":"polea","video_url":"https://v/2"}},
            {"routine_exercise_id":"re-1","order_index":0,"sets":null,"reps":null,"rest_seconds":null,
             "suggested_kg":null,"tempo":null,"notes":null,
             "exercise":{"id":"ex-1","name":"Press banca","muscle_group":null,"equipment":null,"video_url":null}},
            {"routine_exercise_id":"re-x","order_index":2,"exercise":null}
          ]}]}
    """.trimIndent()

    // Review Focus 5: formato de Supabase con microsegundos y offset.
    @Test fun `el payload del backend se decodifica y se guarda como entidades`() {
        val dto = json.decodeFromString<MineResponse>(payload).data.single()

        val entity = dto.toEntity()
        assertEquals("monday,thursday", entity.days)
        assertEquals(OffsetDateTime.parse("2026-10-17T03:00:00.123456+00:00").toInstant().toEpochMilli(), entity.createdAt)

        val exercises = dto.toExerciseEntities()
        assertEquals(listOf("re-2", "re-1"), exercises.map { it.id }) // el ejercicio sin datos se descarta
        assertEquals(2.5, exercises.first().suggestedKg)
        assertEquals("rt-1", exercises.first().routineId)
    }

    @Test fun `created_at ilegible o ausente queda en 0`() {
        assertEquals(0L, parseCreatedAt("ayer"))
        assertEquals(0L, parseCreatedAt(null))
    }

    @Test fun `toDomain ordena los ejercicios y lee los dias`() {
        val row = RoutineWithExercises(
            RoutineEntity("rt-1", "Push", null, "monday,funday", 42L),
            listOf(exercise("re-2", order = 1), exercise("re-1", order = 0)),
        )
        val routine = row.toDomain()
        assertEquals(setOf(DayOfWeek.MONDAY), routine.days)
        assertEquals(Instant.ofEpochMilli(42L), routine.createdAt)
        assertEquals(listOf("re-1", "re-2"), routine.exercises.map { it.id })
    }

    @Test fun `rutina sin dias queda con el set vacio`() {
        val row = RoutineWithExercises(RoutineEntity("rt-1", "Push", null, "", 0L), emptyList())
        assertEquals(emptySet<DayOfWeek>(), row.toDomain().days)
    }

    private fun exercise(id: String, order: Int) = RoutineExerciseEntity(
        id, "rt-1", "ex-$id", "Press", null, null, null, 4, 8, 90, null, null, null, order,
    )
}
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.routine.RoutineMapperTest"`
Expected: FAIL de compilación.

- [ ] **Step 3: API y DTOs**

`mobile/app/src/main/java/com/fittrainer/data/api/RoutineApi.kt`:

```kotlin
package com.fittrainer.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET

/** Rutinas del alumno logueado (va por el cliente con Bearer). */
interface RoutineApi {
    @GET("routines/mine")
    suspend fun mine(): MineResponse
}

@Serializable
data class MineResponse(val data: List<StudentRoutineDto> = emptyList())

@Serializable
data class StudentRoutineDto(
    @SerialName("routine_id") val routineId: String,
    val name: String,
    val goal: String? = null,
    val days: List<String> = emptyList(),
    @SerialName("created_at") val createdAt: String? = null,
    val exercises: List<RoutineExerciseDto> = emptyList(),
)

@Serializable
data class RoutineExerciseDto(
    @SerialName("routine_exercise_id") val id: String,
    val exercise: ExerciseDto? = null,
    val sets: Int? = null,
    val reps: Int? = null,
    @SerialName("rest_seconds") val restSeconds: Int? = null,
    @SerialName("suggested_kg") val suggestedKg: Double? = null,
    val tempo: String? = null,
    val notes: String? = null,
    @SerialName("order_index") val orderIndex: Int = 0,
)

@Serializable
data class ExerciseDto(
    val id: String,
    val name: String,
    @SerialName("muscle_group") val muscleGroup: String? = null,
    val equipment: String? = null,
    @SerialName("video_url") val videoUrl: String? = null,
)
```

- [ ] **Step 4: Mapeo**

`mobile/app/src/main/java/com/fittrainer/data/routine/RoutineMapper.kt`:

```kotlin
package com.fittrainer.data.routine

import com.fittrainer.data.api.StudentRoutineDto
import com.fittrainer.data.db.routine.RoutineEntity
import com.fittrainer.data.db.routine.RoutineExerciseEntity
import com.fittrainer.data.db.routine.RoutineWithExercises
import java.time.Instant
import java.time.OffsetDateTime

fun StudentRoutineDto.toEntity() = RoutineEntity(
    id = routineId,
    name = name,
    goal = goal,
    days = days.joinToString(","),
    createdAt = parseCreatedAt(createdAt),
)

/** Un ejercicio sin datos del ejercicio (no debería pasar: hay FK) se descarta en vez de romper el sync. */
fun StudentRoutineDto.toExerciseEntities(): List<RoutineExerciseEntity> = exercises.mapNotNull { dto ->
    val exercise = dto.exercise ?: return@mapNotNull null
    RoutineExerciseEntity(
        id = dto.id,
        routineId = routineId,
        exerciseId = exercise.id,
        name = exercise.name,
        muscleGroup = exercise.muscleGroup,
        equipment = exercise.equipment,
        videoUrl = exercise.videoUrl,
        sets = dto.sets,
        reps = dto.reps,
        restSeconds = dto.restSeconds,
        suggestedKg = dto.suggestedKg,
        tempo = dto.tempo,
        notes = dto.notes,
        orderIndex = dto.orderIndex,
    )
}

fun RoutineWithExercises.toDomain() = Routine(
    id = routine.id,
    name = routine.name,
    goal = routine.goal,
    days = parseDays(routine.days.split(',')),
    createdAt = Instant.ofEpochMilli(routine.createdAt),
    exercises = exercises.sortedBy { it.orderIndex }.map { it.toDomain() },
)

private fun RoutineExerciseEntity.toDomain() = RoutineExercise(
    id = id,
    exerciseId = exerciseId,
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
    videoUrl = videoUrl,
    sets = sets,
    reps = reps,
    restSeconds = restSeconds,
    suggestedKg = suggestedKg,
    tempo = tempo,
    notes = notes,
)

/** created_at de Supabase ("2026-10-17T03:00:00.123456+00:00") a epoch millis; ilegible o ausente → 0. */
fun parseCreatedAt(raw: String?): Long =
    raw?.let { runCatching { OffsetDateTime.parse(it).toInstant().toEpochMilli() }.getOrNull() } ?: 0L
```

- [ ] **Step 5: Correr el test del mapeo**

Run: el mismo comando del Step 2.
Expected: PASS (4 tests).

- [ ] **Step 6: Conectividad, DI y permiso**

`mobile/app/src/main/java/com/fittrainer/data/network/ConnectivityObserver.kt`:

```kotlin
package com.fittrainer.data.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged

/** ¿Hay red? Emite el estado actual al suscribirse y después cada cambio. */
interface ConnectivityObserver {
    val isOnline: Flow<Boolean>
}

class AndroidConnectivityObserver @Inject constructor(
    @ApplicationContext private val context: Context,
) : ConnectivityObserver {

    override val isOnline: Flow<Boolean> = callbackFlow {
        val manager = context.getSystemService(ConnectivityManager::class.java)
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                trySend(true)
            }

            override fun onLost(network: Network) {
                trySend(false)
            }
        }
        trySend(manager.activeNetwork != null)
        manager.registerDefaultNetworkCallback(callback)
        awaitClose { manager.unregisterNetworkCallback(callback) }
    }.distinctUntilChanged()
}
```

`mobile/app/src/main/java/com/fittrainer/di/RoutineModule.kt`:

```kotlin
package com.fittrainer.di

import com.fittrainer.data.network.AndroidConnectivityObserver
import com.fittrainer.data.network.ConnectivityObserver
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class RoutineModule {

    @Binds
    abstract fun bindConnectivityObserver(impl: AndroidConnectivityObserver): ConnectivityObserver
}
```

En `mobile/app/src/main/java/com/fittrainer/di/NetworkModule.kt`, sumar el import `com.fittrainer.data.api.RoutineApi` y, debajo de `provideApi`:

```kotlin
    @Provides
    @Singleton
    fun provideRoutineApi(client: OkHttpClient, json: Json): RoutineApi =
        retrofit(client, json).create(RoutineApi::class.java)
```

En `mobile/app/src/main/AndroidManifest.xml`, debajo del permiso de `INTERNET`:

```xml
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

- [ ] **Step 7: Compilar**

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL, todos los tests en verde.

- [ ] **Step 8: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src/main mobile/app/src/test/java/com/fittrainer/data/routine/RoutineMapperTest.kt
git commit -m "feat(mobile): API de rutinas, mapeo a Room y observador de conectividad"
```

---

### Task 6: Mobile — `RoutineRepository` y borrado del caché al cerrar sesión

**Files:**
- Modify: `mobile/app/src/main/java/com/fittrainer/data/repository/DataError.kt` (mover `toDataError` acá)
- Modify: `mobile/app/src/main/java/com/fittrainer/data/repository/HealthRepository.kt` (usar el compartido)
- Create: `mobile/app/src/main/java/com/fittrainer/data/routine/RoutineRepository.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/session/UserDataCleaner.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/session/TokenSessionRepository.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/di/RoutineModule.kt`
- Create: `mobile/app/src/test/java/com/fittrainer/testing/fakes/routine/FakeRoutine.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/routine/RoutineRepositoryTest.kt`
- Modify: `mobile/app/src/test/java/com/fittrainer/data/session/TokenSessionRepositoryTest.kt`

**Interfaces:**
- Consumes: `RoutineApi`, DTOs y mapeo (Task 5); `RoutineDao` y entidades (Task 4); `RoutineCache` (Task 2).
- Produces:
  - `class RoutineRepository(api: RoutineApi, dao: RoutineDao, clock: Clock) : UserDataCleaner` con `fun observeCache(ownerId: String): Flow<RoutineCache>`, `suspend fun refresh(ownerId: String): Result<Unit>` (falla con `DataException`), `override suspend fun clearUserData()`.
  - `interface UserDataCleaner { suspend fun clearUserData() }`
  - `fun Exception.toDataError(): DataError` (paquete `com.fittrainer.data.repository`).
  - Fakes: `FakeRoutineApi(response, error)` con `calls` y `gate`, `FakeRoutineDao`, `routineDto(...)`, `exerciseDto(...)`.

- [ ] **Step 1: Fakes de prueba**

`mobile/app/src/test/java/com/fittrainer/testing/fakes/routine/FakeRoutine.kt`:

```kotlin
package com.fittrainer.testing.fakes.routine

import com.fittrainer.data.api.ExerciseDto
import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.api.RoutineApi
import com.fittrainer.data.api.RoutineExerciseDto
import com.fittrainer.data.api.StudentRoutineDto
import com.fittrainer.data.db.routine.RoutineDao
import com.fittrainer.data.db.routine.RoutineEntity
import com.fittrainer.data.db.routine.RoutineExerciseEntity
import com.fittrainer.data.db.routine.RoutineSyncEntity
import com.fittrainer.data.db.routine.RoutineWithExercises
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update

fun exerciseDto(id: String = "re-1", order: Int = 0) = RoutineExerciseDto(
    id = id,
    exercise = ExerciseDto(id = "ex-$id", name = "Ejercicio $id", muscleGroup = "chest"),
    sets = 4,
    reps = 8,
    restSeconds = 90,
    orderIndex = order,
)

fun routineDto(
    id: String = "rt-1",
    days: List<String> = listOf("monday"),
    createdAt: String = "2026-10-01T10:00:00+00:00",
    exercises: List<RoutineExerciseDto> = listOf(exerciseDto()),
) = StudentRoutineDto(routineId = id, name = "Rutina $id", goal = "strength", days = days, createdAt = createdAt, exercises = exercises)

/** API falsa: devuelve [response] o lanza [error]. Si [gate] no es null, espera a que se complete. */
class FakeRoutineApi(
    var response: MineResponse = MineResponse(listOf(routineDto())),
    var error: Throwable? = null,
) : RoutineApi {
    var calls = 0
    var gate: CompletableDeferred<Unit>? = null

    override suspend fun mine(): MineResponse {
        calls++
        gate?.await()
        error?.let { throw it }
        return response
    }
}

/** DAO falso en memoria. replaceAll y clear son los del RoutineDao real (llaman a estas primitivas). */
class FakeRoutineDao : RoutineDao() {
    val routines = MutableStateFlow<List<RoutineEntity>>(emptyList())
    val exercises = MutableStateFlow<List<RoutineExerciseEntity>>(emptyList())
    val sync = MutableStateFlow<RoutineSyncEntity?>(null)

    override fun observeRoutines(): Flow<List<RoutineWithExercises>> = combine(routines, exercises) { r, e ->
        r.map { routine -> RoutineWithExercises(routine, e.filter { it.routineId == routine.id }) }
    }

    override fun observeSync(): Flow<RoutineSyncEntity?> = sync
    override suspend fun insertRoutines(routines: List<RoutineEntity>) = this.routines.update { it + routines }
    override suspend fun insertExercises(exercises: List<RoutineExerciseEntity>) = this.exercises.update { it + exercises }
    override suspend fun upsertSync(sync: RoutineSyncEntity) { this.sync.value = sync }
    override suspend fun deleteExercises() { exercises.value = emptyList() }
    override suspend fun deleteRoutines() { routines.value = emptyList() }
    override suspend fun deleteSync() { sync.value = null }
}
```

- [ ] **Step 2: Test del repositorio (falla)**

`mobile/app/src/test/java/com/fittrainer/data/routine/RoutineRepositoryTest.kt`:

```kotlin
package com.fittrainer.data.routine

import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.routineDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

class RoutineRepositoryTest {

    private val clock = Clock.fixed(Instant.ofEpochMilli(5_000L), ZoneOffset.UTC)
    private val api = FakeRoutineApi()
    private val dao = FakeRoutineDao()
    private val repo = RoutineRepository(api, dao, clock)

    @Test fun `sin sync el cache sale vacio y sin fecha`() = runTest {
        val cache = repo.observeCache("u1").first()
        assertTrue(cache.routines.isEmpty())
        assertNull(cache.lastSyncedAt)
    }

    @Test fun `refresh guarda las rutinas con su duenio y la hora del dispositivo`() = runTest {
        assertTrue(repo.refresh("u1").isSuccess)

        val cache = repo.observeCache("u1").first()
        assertEquals(listOf("rt-1"), cache.routines.map { it.id })
        assertEquals(1, cache.routines.single().exercises.size)
        assertEquals(Instant.ofEpochMilli(5_000L), cache.lastSyncedAt)
        assertEquals("u1", dao.sync.value?.ownerId)
    }

    @Test fun `refresh reemplaza todo y una rutina desactivada desaparece`() = runTest {
        api.response = MineResponse(listOf(routineDto("rt-1"), routineDto("rt-2")))
        repo.refresh("u1")
        api.response = MineResponse(listOf(routineDto("rt-2")))
        repo.refresh("u1")

        assertEquals(listOf("rt-2"), repo.observeCache("u1").first().routines.map { it.id })
    }

    @Test fun `refresh sin red devuelve Offline y no toca el cache`() = runTest {
        repo.refresh("u1")
        api.error = IOException("sin red")

        val result = repo.refresh("u1")

        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals(listOf("rt-1"), repo.observeCache("u1").first().routines.map { it.id })
    }

    @Test fun `refresh con 500 devuelve Http y no toca el cache`() = runTest {
        repo.refresh("u1")
        api.error = HttpException(Response.error<Any>(500, "".toResponseBody(null)))

        val result = repo.refresh("u1")

        assertEquals(DataError.Http(500), (result.exceptionOrNull() as DataException).error)
        assertEquals(1, repo.observeCache("u1").first().routines.size)
    }

    // Review Focus 4: la sesión anterior terminó sin "Cerrar sesión" y entra otra persona.
    @Test fun `el cache de otro usuario se ve como nunca sincronizado`() = runTest {
        repo.refresh("u1")

        val other = repo.observeCache("u2").first()
        assertTrue(other.routines.isEmpty())
        assertNull(other.lastSyncedAt)
    }

    @Test fun `clearUserData deja el cache vacio`() = runTest {
        repo.refresh("u1")
        repo.clearUserData()

        val cache = repo.observeCache("u1").first()
        assertTrue(cache.routines.isEmpty())
        assertNull(cache.lastSyncedAt)
    }
}
```

- [ ] **Step 3: Correr y ver que falla**

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.routine.RoutineRepositoryTest"`
Expected: FAIL de compilación (`RoutineRepository` no existe).

- [ ] **Step 4: Mapeo de errores compartido**

En `mobile/app/src/main/java/com/fittrainer/data/repository/DataError.kt`, agregar los imports `java.io.IOException` y `retrofit2.HttpException` y al final:

```kotlin
/** Falla de red, HTTP o de parseo → error que entiende la UI. */
fun Exception.toDataError(): DataError = when (this) {
    is IOException -> DataError.Offline
    is HttpException -> DataError.Http(code())
    else -> DataError.Unknown
}
```

En `mobile/app/src/main/java/com/fittrainer/data/repository/HealthRepository.kt`, borrar la función privada `toDataError` del final (y los imports `java.io.IOException` y `retrofit2.HttpException`, que quedan sin uso). Las llamadas `e.toDataError()` siguen igual: ahora resuelven a la del mismo paquete.

- [ ] **Step 5: `UserDataCleaner` y repositorio**

`mobile/app/src/main/java/com/fittrainer/data/session/UserDataCleaner.kt`:

```kotlin
package com.fittrainer.data.session

/** Borra los datos del usuario guardados en el dispositivo (cachés de Room). Se llama al cerrar sesión. */
interface UserDataCleaner {
    suspend fun clearUserData()
}
```

`mobile/app/src/main/java/com/fittrainer/data/routine/RoutineRepository.kt`:

```kotlin
package com.fittrainer.data.routine

import com.fittrainer.data.api.RoutineApi
import com.fittrainer.data.db.routine.RoutineDao
import com.fittrainer.data.db.routine.RoutineSyncEntity
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine

/**
 * Offline-first: la UI observa Room; refresh() trae de la API y reemplaza el caché entero.
 * El caché tiene dueño: lo guardado para otro alumno se ve como "nunca sincronizó".
 */
@Singleton
class RoutineRepository @Inject constructor(
    private val api: RoutineApi,
    private val dao: RoutineDao,
    private val clock: Clock,
) : UserDataCleaner {

    fun observeCache(ownerId: String): Flow<RoutineCache> =
        combine(dao.observeRoutines(), dao.observeSync()) { rows, sync ->
            if (sync == null || sync.ownerId != ownerId) {
                RoutineCache(emptyList(), null)
            } else {
                RoutineCache(rows.map { it.toDomain() }, Instant.ofEpochMilli(sync.lastSyncedAt))
            }
        }

    /** Si falla, Room queda como estaba y el error viaja en un [DataException]. */
    suspend fun refresh(ownerId: String): Result<Unit> = try {
        val routines = api.mine().data
        dao.replaceAll(
            RoutineSyncEntity(ownerId = ownerId, lastSyncedAt = clock.millis()),
            routines.map { it.toEntity() },
            routines.flatMap { it.toExerciseEntities() },
        )
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    override suspend fun clearUserData() = dao.clear()
}
```

- [ ] **Step 6: Correr el test del repositorio**

Run: el mismo comando del Step 3.
Expected: PASS (7 tests).

- [ ] **Step 7: Test del cierre de sesión (falla)**

En `mobile/app/src/test/java/com/fittrainer/data/session/TokenSessionRepositoryTest.kt`:
- reemplazar la línea del `repo` por:

```kotlin
    private val cleaner = FakeCleaner()
    private val repo = TokenSessionRepository(store, AuthRepository(api, store, fixedClock()), cleaner)
```

- agregar al final de la clase:

```kotlin
    @Test fun `signOut borra los datos del usuario del dispositivo`() = runTest {
        store.save(authState())
        repo.signOut()
        assertEquals(1, cleaner.calls)
    }

    @Test fun `si el borrado falla la sesion igual queda cerrada`() = runTest {
        store.save(authState())
        cleaner.error = IllegalStateException("disco")
        assertEquals(LogoutResult.Closed, repo.signOut())
        assertEquals(Session.LoggedOut, repo.session.first())
    }

    private class FakeCleaner : UserDataCleaner {
        var calls = 0
        var error: Exception? = null
        override suspend fun clearUserData() {
            calls++
            error?.let { throw it }
        }
    }
```

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.session.TokenSessionRepositoryTest"`
Expected: FAIL de compilación (el constructor no recibe el cleaner).

- [ ] **Step 8: Borrar el caché al cerrar sesión**

`mobile/app/src/main/java/com/fittrainer/data/session/TokenSessionRepository.kt` queda:

```kotlin
package com.fittrainer.data.session

import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.auth.tokenstore.TokenStore
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** La sesión es lo que hay en el TokenStore cifrado: si hay tokens, el usuario está adentro. */
class TokenSessionRepository @Inject constructor(
    private val tokenStore: TokenStore,
    private val authRepository: AuthRepository,
    private val userDataCleaner: UserDataCleaner,
) : SessionRepository {

    override val session: Flow<Session> = tokenStore.state.map { state ->
        when (state?.user?.role) {
            null -> Session.LoggedOut
            Role.STUDENT -> Session.Student(state.user)
            Role.TRAINER -> Session.Trainer(state.user)
        }
    }

    /**
     * Cierra la sesión y después borra los datos locales del usuario. Si el borrado falla, la sesión
     * igual queda cerrada: el caché tiene dueño y otro usuario no lo ve.
     */
    override suspend fun signOut(): LogoutResult {
        val result = authRepository.logout()
        try {
            userDataCleaner.clearUserData()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Sin acción: ver el comentario de la función.
        }
        return result
    }
}
```

En `mobile/app/src/main/java/com/fittrainer/di/RoutineModule.kt`, sumar los imports `com.fittrainer.data.routine.RoutineRepository` y `com.fittrainer.data.session.UserDataCleaner` y el binding:

```kotlin
    @Binds
    abstract fun bindUserDataCleaner(impl: RoutineRepository): UserDataCleaner
```

- [ ] **Step 9: Correr todo**

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL; pasan los tests nuevos y los de `HealthRepositoryTest` y `TokenSessionRepositoryTest`.

- [ ] **Step 10: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src/main mobile/app/src/test
git commit -m "feat(mobile): repositorio de rutinas offline-first y borrado del caché al cerrar sesión"
```

---

### Task 7: Mobile — `TodayViewModel`

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/TodayUiState.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/TodayViewModel.kt`
- Create: `mobile/app/src/test/java/com/fittrainer/testing/fakes/routine/FakeTodayDeps.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/today/TodayViewModelTest.kt`

**Interfaces:**
- Consumes: `RoutineRepository` (Task 6), `resolveToday`, `TodayContent` (Task 2), `ConnectivityObserver` (Task 5), `SessionRepository`/`Session` (existentes), `Clock` (provisto por `DatabaseModule`).
- Produces:
  - `data class TodayUiState(content: TodayContent?, studentName: String, today: LocalDate, isOffline: Boolean, lastSyncedAt: Instant?, isRefreshing: Boolean, notice: String?)`
  - `const val MANUAL_REFRESH_FAILED = "No pudimos actualizar. Mostrando tu última rutina"`
  - `TodayViewModel.uiState: StateFlow<TodayUiState>`, `onStart()`, `onPullToRefresh()`, `dismissNotice()`.

- [ ] **Step 1: Dependencias falsas**

`mobile/app/src/test/java/com/fittrainer/testing/fakes/routine/FakeTodayDeps.kt`:

```kotlin
package com.fittrainer.testing.fakes.routine

import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.LogoutResult
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

class FakeConnectivityObserver(online: Boolean = true) : ConnectivityObserver {
    val state = MutableStateFlow(online)
    override val isOnline: Flow<Boolean> = state
}

class FakeStudentSession(
    user: AuthUser = AuthUser("u1", "Ana Pérez", "ana@test.com", Role.STUDENT),
) : SessionRepository {
    override val session = MutableStateFlow<Session>(Session.Student(user))
    override suspend fun signOut() = LogoutResult.Closed
}

/** Reloj que se puede adelantar a mano (para cruzar la medianoche en un test). */
class StepClock(var now: Instant, private val zone: ZoneId = ZoneOffset.UTC) : Clock() {
    override fun getZone(): ZoneId = zone
    override fun withZone(zone: ZoneId): Clock = StepClock(now, zone)
    override fun instant(): Instant = now
}
```

- [ ] **Step 2: Test del ViewModel (falla)**

`mobile/app/src/test/java/com/fittrainer/ui/today/TodayViewModelTest.kt`:

```kotlin
package com.fittrainer.ui.today

import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import java.io.IOException
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
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

class TodayViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val monday = LocalDate.of(2026, 10, 19)
    private val clock = StepClock(monday.atTime(10, 0).toInstant(ZoneOffset.UTC))
    private val api = FakeRoutineApi() // por defecto: una rutina de los lunes
    private val connectivity = FakeConnectivityObserver(online = true)

    private fun viewModel() =
        TodayViewModel(RoutineRepository(api, FakeRoutineDao(), clock), FakeStudentSession(), connectivity, clock)

    private fun TestScope.collect(vm: TodayViewModel) =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    @Test fun `antes del primer sync muestra NeverSynced y el nombre`() = runTest {
        val vm = viewModel()
        collect(vm)
        assertEquals(TodayContent.NeverSynced, vm.uiState.value.content)
        assertEquals("Ana Pérez", vm.uiState.value.studentName)
        assertEquals(0, api.calls)
    }

    @Test fun `onStart refresca y muestra la rutina de hoy`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        val state = vm.uiState.value
        assertTrue(state.content is TodayContent.Training)
        assertFalse(state.isRefreshing)
        assertEquals(monday, state.today)
    }

    @Test fun `sin red muestra el cache con el indicador y sin aviso`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        connectivity.state.value = false
        api.error = IOException("sin red")
        vm.onStart()

        val state = vm.uiState.value
        assertTrue(state.isOffline)
        assertTrue(state.content is TodayContent.Training)
        assertNull(state.notice)
    }

    @Test fun `al volver la red refresca solo`() = runTest {
        connectivity.state.value = false
        val vm = viewModel()
        collect(vm)
        assertEquals(0, api.calls)

        connectivity.state.value = true

        assertEquals(1, api.calls)
        assertTrue(vm.uiState.value.content is TodayContent.Training)
    }

    @Test fun `los refrescos simultaneos se deduplican`() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        val vm = viewModel()
        collect(vm)

        vm.onStart()
        vm.onPullToRefresh()
        vm.onStart()
        assertTrue(vm.uiState.value.isRefreshing)
        assertEquals(1, api.calls)

        gate.complete(Unit)
        assertFalse(vm.uiState.value.isRefreshing)
    }

    @Test fun `pull to refresh fallido muestra el aviso suave y se puede cerrar`() = runTest {
        api.error = IOException("sin red")
        val vm = viewModel()
        collect(vm)

        vm.onPullToRefresh()
        assertEquals(MANUAL_REFRESH_FAILED, vm.uiState.value.notice)

        vm.dismissNotice()
        assertNull(vm.uiState.value.notice)
    }

    @Test fun `pasada la medianoche onStart recalcula el dia`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        assertTrue(vm.uiState.value.content is TodayContent.Training)

        clock.now = monday.plusDays(1).atTime(0, 10).toInstant(ZoneOffset.UTC)
        vm.onStart()

        val content = vm.uiState.value.content as TodayContent.Rest
        assertEquals(DayOfWeek.MONDAY, content.nextDay)
    }
}
```

- [ ] **Step 3: Correr y ver que falla**

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.today.TodayViewModelTest"`
Expected: FAIL de compilación.

- [ ] **Step 4: Estado de la pantalla**

`mobile/app/src/main/java/com/fittrainer/ui/today/TodayUiState.kt`:

```kotlin
package com.fittrainer.ui.today

import com.fittrainer.data.routine.TodayContent
import java.time.Instant
import java.time.LocalDate

const val MANUAL_REFRESH_FAILED = "No pudimos actualizar. Mostrando tu última rutina"

/** content == null: todavía no se leyó Room. notice: aviso suave del último pull-to-refresh fallido. */
data class TodayUiState(
    val content: TodayContent? = null,
    val studentName: String = "",
    val today: LocalDate,
    val isOffline: Boolean = false,
    val lastSyncedAt: Instant? = null,
    val isRefreshing: Boolean = false,
    val notice: String? = null,
)
```

- [ ] **Step 5: ViewModel**

`mobile/app/src/main/java/com/fittrainer/ui/today/TodayViewModel.kt`:

```kotlin
package com.fittrainer.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.routine.resolveToday
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.shareIn
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Pantalla "Hoy". Lee siempre de Room (vía el repositorio) y refresca en segundo plano:
 * al quedar visible, al volver la red y con pull-to-refresh. Nunca dos refrescos a la vez.
 */
@HiltViewModel
class TodayViewModel @Inject constructor(
    private val repository: RoutineRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val student: StateFlow<AuthUser?> = sessionRepository.session
        .map { (it as? Session.Student)?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val today = MutableStateFlow(LocalDate.now(clock))
    private val refreshState = MutableStateFlow(RefreshState())
    private var refreshJob: Job? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = student.filterNotNull().flatMapLatest { repository.observeCache(it.id) }

    val uiState: StateFlow<TodayUiState> =
        combine(cache, student, today, online, refreshState) { c, user, date, isOnline, r ->
            TodayUiState(
                content = resolveToday(c.routines, date, everSynced = c.lastSyncedAt != null),
                studentName = user?.name.orEmpty(),
                today = date,
                isOffline = !isOnline,
                lastSyncedAt = c.lastSyncedAt,
                isRefreshing = r.isRefreshing,
                notice = r.notice,
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TodayUiState(today = LocalDate.now(clock)))

    init {
        // Volvió la red con la pantalla abierta. drop(1): el estado al suscribirse no es un cambio.
        viewModelScope.launch { online.drop(1).filter { it }.collect { refresh(manual = false) } }
    }

    /** La pantalla quedó visible (al entrar o al volver la app al frente): recalcula el día y refresca. */
    fun onStart() {
        today.value = LocalDate.now(clock)
        refresh(manual = false)
    }

    fun onPullToRefresh() = refresh(manual = true)

    fun dismissNotice() = refreshState.update { it.copy(notice = null) }

    /** Solo el refresco manual avisa si falla; el automático muestra lo que hay en Room sin alarmar. */
    private fun refresh(manual: Boolean) {
        if (refreshJob?.isActive == true) return
        refreshJob = viewModelScope.launch {
            val user = student.filterNotNull().first()
            refreshState.update { it.copy(isRefreshing = true, notice = null) }
            val failed = repository.refresh(user.id).isFailure
            refreshState.value = RefreshState(notice = if (manual && failed) MANUAL_REFRESH_FAILED else null)
        }
    }

    private data class RefreshState(val isRefreshing: Boolean = false, val notice: String? = null)
}
```

- [ ] **Step 6: Correr y ver que pasa**

Run: el mismo comando del Step 3.
Expected: PASS (7 tests).

- [ ] **Step 7: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src/main/java/com/fittrainer/ui/today mobile/app/src/test
git commit -m "feat(mobile): ViewModel de la rutina del día (refresh al volver al frente, al reconectar y manual)"
```

---

### Task 8: Mobile — pantalla "Hoy" y pestaña del alumno

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/TodayScreen.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/components/TodayHeader.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/components/WeekStrip.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/components/RoutineHeroCard.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/components/ExerciseRow.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/components/ExerciseDetailSheet.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/components/TodayStates.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/navigation/RoleTabs.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/navigation/RoleShell.kt`

**Interfaces:**
- Consumes: `TodayViewModel`, `TodayUiState` (Task 7); textos (Task 3); `Routine`, `RoutineExercise`, `TodayContent` (Task 2).
- Produces: `@Composable fun TodayScreen(viewModel: TodayViewModel = hiltViewModel())`; `const val STUDENT_TODAY_ROUTE = "student/today"`.

El proyecto no tiene tests de UI de Compose: esta tarea se verifica compilando y con la prueba de la Task 9.

- [ ] **Step 1: Encabezado y aviso**

`mobile/app/src/main/java/com/fittrainer/ui/today/components/TodayHeader.kt`:

```kotlin
package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.headerDate
import java.time.LocalDate

@Composable
fun TodayHeader(date: LocalDate, studentName: String, isOffline: Boolean) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text(headerDate(date), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        val firstName = studentName.trim().substringBefore(' ')
        Text(
            text = if (firstName.isEmpty()) "Hola" else "Hola, $firstName",
            style = MaterialTheme.typography.headlineSmall,
            color = FtColors.TextPrimary,
        )
        if (isOffline) OfflineIndicator()
    }
}

/** Discreto a propósito: sin señal la app tiene que sentirse confiable, no rota. */
@Composable
private fun OfflineIndicator() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Box(Modifier.size(6.dp).background(FtColors.Amber, CircleShape))
        Text(
            "Sin conexión — mostrando tu última rutina",
            style = MaterialTheme.typography.bodySmall,
            color = FtColors.TextSecondary,
        )
    }
}

@Composable
fun NoticeBanner(message: String, onDismiss: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(FtColors.Elevated, MaterialTheme.shapes.medium)
            .padding(start = Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            message,
            modifier = Modifier.weight(1f).padding(vertical = Spacing.md),
            style = MaterialTheme.typography.bodySmall,
            color = FtColors.TextPrimary,
        )
        TextButton(onClick = onDismiss, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
            Text("OK")
        }
    }
}
```

- [ ] **Step 2: Tira semanal**

`mobile/app/src/main/java/com/fittrainer/ui/today/components/WeekStrip.kt`:

```kotlin
package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.dayInitial
import com.fittrainer.ui.today.dayName
import java.time.DayOfWeek

/** L a D: días con entrenamiento marcados y hoy resaltado. No marca días hechos (llega con sesiones). */
@Composable
fun WeekStrip(trainingDays: Set<DayOfWeek>, today: DayOfWeek) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.medium).padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text("SEMANA", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            DayOfWeek.values().forEach { day ->
                DayChip(day, training = day in trainingDays, isToday = day == today)
            }
        }
    }
}

@Composable
private fun DayChip(day: DayOfWeek, training: Boolean, isToday: Boolean) {
    val shape = MaterialTheme.shapes.small
    val background = when {
        training && isToday -> FtColors.Brand
        training -> FtColors.Elevated
        else -> Color.Transparent
    }
    val description = buildString {
        append(dayName(day))
        append(if (training) ", entrenás" else ", descanso")
        if (isToday) append(", hoy")
    }
    Box(
        Modifier
            .size(32.dp)
            .background(background, shape)
            .then(if (isToday) Modifier.border(1.dp, FtColors.BrandText, shape) else Modifier)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            dayInitial(day),
            style = MaterialTheme.typography.labelMedium,
            color = if (training) FtColors.TextPrimary else FtColors.Ink5,
        )
    }
}
```

- [ ] **Step 3: Tarjeta de la rutina**

`mobile/app/src/main/java/com/fittrainer/ui/today/components/RoutineHeroCard.kt`:

```kotlin
package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.routine.Routine
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.heroSummary

/** Un solo CTA. "Empezar" queda deshabilitado hasta que exista el registro de sesiones (S3). */
@Composable
fun RoutineHeroCard(routine: Routine) {
    val shape = MaterialTheme.shapes.large
    Column(
        Modifier
            .fillMaxWidth()
            .background(FtColors.Card, shape)
            .border(1.dp, FtColors.Border, shape)
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(routine.name, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
        Text(heroSummary(routine), style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Button(
            onClick = {},
            enabled = false,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).padding(top = Spacing.sm),
        ) {
            Icon(Icons.Filled.PlayArrow, contentDescription = null)
            Spacer(Modifier.width(Spacing.sm))
            Text("Empezar")
        }
        Text(
            "Disponible con el registro de sesiones",
            style = MaterialTheme.typography.bodySmall,
            color = FtColors.TextSecondary,
        )
    }
}
```

- [ ] **Step 4: Fila de ejercicio y título de sección**

`mobile/app/src/main/java/com/fittrainer/ui/today/components/ExerciseRow.kt`:

```kotlin
package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.exerciseSubtitle

@Composable
fun SectionLabel(title: String, trailing: String) {
    Row(Modifier.fillMaxWidth().padding(top = Spacing.sm), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(title, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Text(trailing, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    }
}

@Composable
fun ExerciseRow(exercise: RoutineExercise, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .clip(MaterialTheme.shapes.medium)
            .background(FtColors.Card)
            .clickable(onClickLabel = "Ver detalle", onClick = onClick)
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(exercise.name, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
            val subtitle = exerciseSubtitle(exercise)
            if (subtitle.isNotEmpty()) {
                Text(subtitle, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            }
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = FtColors.TextSecondary)
    }
}
```

- [ ] **Step 5: Hoja de detalle del ejercicio**

`mobile/app/src/main/java/com/fittrainer/ui/today/components/ExerciseDetailSheet.kt`:

```kotlin
package com.fittrainer.ui.today.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.formatKg
import com.fittrainer.ui.today.muscleLabel

/** Detalle del ejercicio. El video es un link externo: solo se ofrece con red. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseDetailSheet(exercise: RoutineExercise, canOpenVideo: Boolean, onDismiss: () -> Unit) {
    val uriHandler = LocalUriHandler.current
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = FtColors.Surface) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = Spacing.lg).padding(bottom = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            Text(exercise.name, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            val muscle = muscleLabel(exercise.muscleGroup)
            if (muscle.isNotEmpty()) {
                Text(muscle.uppercase(), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
            }
            DetailLine("Series", exercise.sets?.toString())
            DetailLine("Repeticiones", exercise.reps?.toString())
            DetailLine("Peso sugerido", exercise.suggestedKg?.let(::formatKg))
            DetailLine("Tempo", exercise.tempo)
            DetailLine("Descanso", exercise.restSeconds?.let { "$it s" })
            DetailLine("Equipo", exercise.equipment)
            val notes = exercise.notes
            if (!notes.isNullOrBlank()) {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text("NOTA DEL ENTRENADOR", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
                    Text(notes, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
                }
            }
            val video = exercise.videoUrl
            if (video != null && canOpenVideo) {
                OutlinedButton(
                    // Sin app que abra el link, no se hace nada (no se rompe la pantalla).
                    onClick = { runCatching { uriHandler.openUri(video) } },
                    modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                ) { Text("Ver video") }
            }
        }
    }
}

@Composable
private fun DetailLine(label: String, value: String?) {
    if (value.isNullOrBlank()) return
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        Text(value, style = MaterialTheme.typography.labelMedium, color = FtColors.TextPrimary)
    }
}
```

- [ ] **Step 6: Estados sin entrenamiento**

`mobile/app/src/main/java/com/fittrainer/ui/today/components/TodayStates.kt`:

```kotlin
package com.fittrainer.ui.today.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.restMessage
import java.time.DayOfWeek

@Composable
fun RestState(nextDay: DayOfWeek?) = InfoCard("Día de descanso", restMessage(nextDay))

@Composable
fun NoRoutineState() = InfoCard(
    "Sin rutina por ahora",
    "Tu entrenador todavía no te asignó una rutina. Escribile para arrancar.",
)

@Composable
fun NeverSyncedState() = InfoCard("Todavía no hay datos", "Conectate una vez para descargar tu rutina.")

/** Ninguno de estos estados es un error: nada de rojo. */
@Composable
private fun InfoCard(title: String, message: String) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, MaterialTheme.shapes.large).padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text(message, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
    }
}
```

- [ ] **Step 7: Pantalla**

`mobile/app/src/main/java/com/fittrainer/ui/today/TodayScreen.kt`:

```kotlin
package com.fittrainer.ui.today

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.components.ExerciseDetailSheet
import com.fittrainer.ui.today.components.ExerciseRow
import com.fittrainer.ui.today.components.NeverSyncedState
import com.fittrainer.ui.today.components.NoRoutineState
import com.fittrainer.ui.today.components.NoticeBanner
import com.fittrainer.ui.today.components.RestState
import com.fittrainer.ui.today.components.RoutineHeroCard
import com.fittrainer.ui.today.components.SectionLabel
import com.fittrainer.ui.today.components.TodayHeader
import com.fittrainer.ui.today.components.WeekStrip

/** Guía Mobile p.12 · 02 Rutina del día. */
@Composable
fun TodayScreen(viewModel: TodayViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // ON_START: al entrar a la pestaña y cada vez que la app vuelve al frente.
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    TodayBody(state, onRefresh = viewModel::onPullToRefresh, onDismissNotice = viewModel::dismissNotice)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayBody(state: TodayUiState, onRefresh: () -> Unit, onDismissNotice: () -> Unit) {
    var selected by remember { mutableStateOf<RoutineExercise?>(null) }
    PullToRefreshBox(
        isRefreshing = state.isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item { TodayHeader(state.today, state.studentName, state.isOffline) }
            state.notice?.let { notice -> item { NoticeBanner(notice, onDismissNotice) } }
            todayItems(state, onExerciseClick = { selected = it })
        }
    }
    selected?.let { exercise ->
        ExerciseDetailSheet(exercise, canOpenVideo = !state.isOffline, onDismiss = { selected = null })
    }
}

private fun LazyListScope.todayItems(state: TodayUiState, onExerciseClick: (RoutineExercise) -> Unit) {
    val today = state.today.dayOfWeek
    when (val content = state.content) {
        is TodayContent.Training -> {
            item { WeekStrip(content.routine.days, today) }
            item { RoutineHeroCard(content.routine) }
            item { SectionLabel("PLAN DE HOY", content.routine.exercises.size.toString()) }
            items(content.routine.exercises, key = { it.id }) { exercise ->
                ExerciseRow(exercise, onClick = { onExerciseClick(exercise) })
            }
        }
        is TodayContent.Rest -> {
            item { WeekStrip(content.routine.days, today) }
            item { RestState(content.nextDay) }
        }
        TodayContent.NoRoutine -> item { NoRoutineState() }
        TodayContent.NeverSynced -> item { NeverSyncedState() }
        null -> Unit
    }
}
```

- [ ] **Step 8: Pestaña "Hoy" del alumno**

En `mobile/app/src/main/java/com/fittrainer/navigation/RoleTabs.kt`, debajo de `const val HEALTH_ROUTE = "health"`:

```kotlin
const val STUDENT_TODAY_ROUTE = "student/today"
```

y en `StudentTabs`, la primera pestaña pasa a ser:

```kotlin
    Tab(STUDENT_TODAY_ROUTE, "Hoy", Icons.Filled.DateRange),
```

En `mobile/app/src/main/java/com/fittrainer/navigation/RoleShell.kt`, sumar el import `com.fittrainer.ui.today.TodayScreen` y reemplazar el cuerpo de `composable(tab.route) { … }` por:

```kotlin
                composable(tab.route) {
                    when {
                        tab.isAccountMenu -> AccountMenuScreen(
                            title = tab.label,
                            onServerStatus = { navController.navigate(HEALTH_ROUTE) },
                            onSignOut = onSignOut,
                        )
                        tab.route == STUDENT_TODAY_ROUTE -> TodayScreen()
                        else -> PlaceholderScreen(tab.label)
                    }
                }
```

- [ ] **Step 9: Compilar y correr todo**

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL, ningún archivo pasa de 200 líneas, todos los tests en verde.

- [ ] **Step 10: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src/main
git commit -m "feat(mobile): pantalla Rutina del día con caché offline, tira semanal y detalle del ejercicio"
```

---

### Task 9: Prueba del criterio de aceptación (emulador) y verificación final

**Files:** ninguno de código. Si algo falla, se vuelve a la tarea dueña de ese código.

Necesita: el backend de `feature/routines-mine` corriendo en `:3001` mientras mobile está en `feature/android-rutina-del-dia`. **Igna** crea un worktree para el backend: `git worktree add ../fittrainer-routines-mine feature/routines-mine`, copia `backend/.env` y corre `npm install && npm run dev` en `../fittrainer-routines-mine/backend`. Usuarios: el entrenador `profe.e2e.1791936802@test.com` y la alumna `alumna.e2e.1791936802@test.com` de Supabase dev (las contraseñas las tiene Igna).

- [ ] **Step 1: Verificar el endpoint con curl**

```bash
API=http://localhost:3001/api
login() { curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).token'; }
TRAINER=$(login profe.e2e.1791936802@test.com '<contraseña>')
STUDENT=$(login alumna.e2e.1791936802@test.com '<contraseña>')
curl -s $API/routines/mine -H "Authorization: Bearer $STUDENT"   # 200 { data: [...] } (puede ser [])
curl -s -o /dev/null -w '%{http_code}\n' $API/routines/mine -H "Authorization: Bearer $TRAINER"   # 403
```

Si el login responde con otra forma (el token no está en `.token`), ajustar el `node -pe`.

- [ ] **Step 2: Dejar a la alumna con una rutina para hoy**

```bash
STUDENT_ID=$(curl -s $API/students -H "Authorization: Bearer $TRAINER" | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.find(s => s.email === "alumna.e2e.1791936802@test.com").id')
EX=$(curl -s "$API/exercises" -H "Authorization: Bearer $TRAINER" | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.slice(0,3).map(e => e.id).join(",")')
TODAY=$(node -pe 'new Intl.DateTimeFormat("en-US",{weekday:"long",timeZone:"America/Argentina/Buenos_Aires"}).format(new Date()).toLowerCase()')
node -e '
const [student, ex, today] = process.argv.slice(1);
const exercises = ex.split(",").map((id, i) => ({ exercise_id: id, sets: 4, reps: 8, rest_seconds: 90, order: i }));
console.log(JSON.stringify({ student_id: student, name: "Push E2E", goal: "hypertrophy", days: [today], exercises }));
' "$STUDENT_ID" "$EX" "$TODAY" > /tmp/routine.json
ROUTINE_ID=$(curl -s -X POST $API/routines -H "Authorization: Bearer $TRAINER" -H 'Content-Type: application/json' -d @/tmp/routine.json | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.id')
echo $ROUTINE_ID
```

- [ ] **Step 3: Instalar la app en el emulador**

`mobile/.env` con `API_BASE_URL=http://10.0.2.2:3001/api`. Después:

Run: `cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew installDebug`

- [ ] **Step 4: Los 7 pasos del spec (§7)**

1. Login como la alumna con red: la pestaña "Hoy" muestra "Push E2E", la tira semanal con hoy resaltado, los 3 ejercicios; tocar uno abre la hoja con series, reps y descanso.
2. Activar modo avión y cerrar/reabrir la app: se ve lo mismo, con "Sin conexión — mostrando tu última rutina". No hay pantallas rojas.
3. Con el token del entrenador: `curl -s -X PATCH $API/routines/$ROUTINE_ID -H "Authorization: Bearer $TRAINER" -H 'Content-Type: application/json' -d '{"name":"Push E2E v2"}'`
4. Quitar el modo avión con la app abierta: la pantalla pasa sola a "Push E2E v2" (sin tocar nada).
5. `curl … -d '{"days":["<un día que no sea hoy>"]}'` y tirar para refrescar: "Día de descanso" con "Tu próximo entreno es el …".
6. `curl … -d '{"active":false}'` y tirar para refrescar: "Tu entrenador todavía no te asignó una rutina…".
7. Volver a activar la rutina (`{"active":true,"days":["<hoy>"]}`), refrescar, cerrar sesión desde "Perfil" y entrar con el entrenador: no queda nada de la rutina (su pestaña "Inicio" es un placeholder). Volver a entrar como la alumna sin red: "Conectate una vez para descargar tu rutina." (el caché se borró al cerrar sesión).

Extra: con red, en modo avión, tirar para refrescar → aparece "No pudimos actualizar. Mostrando tu última rutina" y "OK" lo cierra.

- [ ] **Step 5: Logs sin datos sensibles**

Run: `adb logcat -d | grep -i -E "bearer|password|refresh_token"`
Expected: sin coincidencias con tokens reales (el logging de OkHttp ya los oculta).

- [ ] **Step 6: Verificación final completa**

```bash
cd ../fittrainer-routines-mine/backend && npm run lint && npm test
cd <repo>/mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew checkFileLength assembleDebug testDebugUnitTest
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew connectedDebugAndroidTest   # emulador prendido
```

Expected: todo en verde. Dejar anotado el resultado de cada paso de la prueba (cuáles pasaron y cuáles no) para el resumen de la tarjeta.

- [ ] **Step 7: Limpieza** (lo resuelve Igna)

Borrar la rutina de prueba si molesta (`PATCH … {"active":false}`) y el worktree cuando el PR del backend esté mergeado: `git worktree remove ../fittrainer-routines-mine`.

---

## Relacionado

- [[tarjetas|Índice de tarjetas]]
- [[superpowers/specs/2026-10-17-rutina-del-dia-design|Spec]]
