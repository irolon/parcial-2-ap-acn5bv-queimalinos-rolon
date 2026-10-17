---
tags: [plan]
tarjeta: 9
---
# Biblioteca de ejercicios en mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el alumno explore la biblioteca de ejercicios (globales + los de su entrenador) desde la pestaña "Mis rutinas", la filtre por grupo muscular con o sin red, y abra un ejercicio para ver descripción y video.

**Architecture:**
- Backend: `GET /api/exercises/library` (solo alumno). El service lee el `trainer_id` del alumno de la base y el repository trae `is_global OR trainer_id = su entrenador`, solo con columnas públicas.
- Mobile, datos: `ExerciseApi` → `LibraryRepository.refresh(ownerId)` reemplaza en una transacción la tabla `library_exercises` (Room v3, `AutoMigration(2→3)`). `observeCache(ownerId)` expone dominio puro. El caché tiene dueño y se borra al cerrar sesión: `UserDataCleaner` pasa a multibinding.
- Mobile, UI: `LibraryViewModel` combina caché, grupo elegido, conectividad y estado del refresh en un `LibraryUiState` armado por una función pura. El filtro es en memoria. `ExerciseRow`, `ExerciseDetailSheet` y los avisos se mudan a `ui/components/` y los comparten Hoy y la biblioteca.

**Tech Stack:** Node 20 + Express (ESM) + Supabase + Jest; Kotlin 2.2.10, Compose (Material 3 vía BOM 2025.08.00), Hilt 2.57.1, Room 2.7.2, Retrofit 2.11.0 + kotlinx.serialization 1.9.0, Lifecycle 2.9.2.

**Spec:** `docs/superpowers/specs/2026-10-17-biblioteca-ejercicios-design.md`

**Desvíos chicos respecto del spec (decididos al planificar, mismo comportamiento):**
- La biblioteca guarda la columna `position` (el índice en la respuesta del backend) y Room ordena por ella. Así el orden es el de Postgres (`order by name`) y no depende de cómo ordena SQLite los acentos.
- Los avisos (`InfoCard`, `NoticeBanner`, `OfflineIndicator`) también se mudan a `ui/components/`: hoy son privados de `ui/today/` y la biblioteca los necesita.
- El "Ver video" sin red ahora muestra "El video necesita conexión" también en Hoy (antes el botón desaparecía). Es la misma hoja de detalle: el comportamiento queda igual en las dos pantallas.

## Global Constraints

- **Git:** los agentes no commitean. Los pasos "Commit" los resuelve Igna. Sin firmas de IA (nada de `Co-Authored-By` ni "Generated with").
- **Ramas:** backend en `feature/exercises-library` (sale de `feature/students-body-metrics`), en el worktree `C:\Users\igna_\Desktop\fittrainer-exercises-library`; mobile en `feature/android-biblioteca` (sale de `feature/android-rutina-del-dia`), en el árbol principal `C:\Users\igna_\desktop\parcial_2_admin`. Las crea Claude en la Task 0 (Igna dio el OK el 17/10).
- **Gradle:** se corre desde `mobile/` con el JDK de Android Studio: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew …` (Git Bash).
- **Backend:** se corre desde `backend/` del worktree: `npm run lint` (incluye el límite de 200 líneas) y `npm test` (corre con `TZ=UTC`).
- **200 líneas físicas** como máximo por archivo de código (tests incluidos). Orden capa → módulo → archivo; los tests copian el árbol del código.
- **Fronteras de capas:** ningún ViewModel ni Composable importa Retrofit, OkHttp ni Room. La UI lee solo de Room vía repositorio.
- **Endpoint:** `GET exercises/library` (relativo a `…/api/`, sin barra inicial), por el cliente principal (con Bearer y `TokenAuthenticator`).
- **Room:** nunca migraciones destructivas. La versión 3 suma `AutoMigration(from = 2, to = 3)` y su caso en `FitTrainerDatabaseMigrationTest`; el schema `3.json` generado se commitea.
- **Grupos musculares del backend, en este orden:** `chest, back, shoulders, legs, glutes, biceps, triceps, core, calves, full_body, cardio`.
- **Textos de UI (copiados del spec y del debate):**
  - título: "Biblioteca"
  - chip: "Todos"
  - nunca sincronizó: "Todavía no hay datos" / "Conectate una vez para bajar la biblioteca."
  - vacía: "Biblioteca vacía" / "Tu entrenador todavía no cargó ejercicios."
  - refresh manual fallido: "No pudimos actualizar. Mostrando la última biblioteca"
  - sin red, en la lista: "Sin conexión — mostrando la última biblioteca"
  - sin red, en el detalle: "El video necesita conexión"
  - bloque del detalle: "DESCRIPCIÓN"
- **Toque mínimo 44 px** (`Spacing.minTouchTarget`), tema oscuro único (`FtColors`).

## Review Focus

1. **Logout con un refresh de la biblioteca en vuelo:** el refresh que termina tarde escribe el caché con el dueño viejo; el alumno siguiente tiene que verlo como "nunca sincronizó". → test en Task 4 (`refresh que termina despues de cerrar sesion no se le muestra a otro`).
2. **Grupo muscular desconocido** (un valor que no está en la lista del backend): el chip aparece al final con el texto tal cual y el filtro funciona. → test en Task 5 (`grupos desconocidos van al final ordenados`).
3. **`video_url` vacío o en blanco** (un `PATCH` con `""` lo guarda así): no se ofrece "Ver video" roto. → test en Task 4 (`video en blanco se guarda como null`).
4. **El grupo elegido desaparece tras un refresh** (el entrenador borró sus únicos ejercicios de ese grupo): la pantalla vuelve a "Todos" en vez de mostrar una lista vacía sin chip. → test en Task 5.
5. **Un `UserDataCleaner` que falla en el logout:** los demás cachés se borran igual y la sesión se cierra. → test en Task 3.

---

### Task 0: Ramas y worktree

**Files:** ninguno de código.

- [ ] **Step 1: Worktree del backend**

```bash
cd /c/Users/igna_/desktop/parcial_2_admin
git fetch origin
git worktree add -b feature/exercises-library /c/Users/igna_/Desktop/fittrainer-exercises-library feature/students-body-metrics
cp backend/.env /c/Users/igna_/Desktop/fittrainer-exercises-library/backend/.env
cd /c/Users/igna_/Desktop/fittrainer-exercises-library/backend && npm install
```

- [ ] **Step 2: Línea base del backend**

Run: `npm run lint && npm test` (en el worktree)
Expected: todo en verde antes de tocar nada.

- [ ] **Step 3: Rama de mobile**

```bash
cd /c/Users/igna_/desktop/parcial_2_admin
git checkout -b feature/android-biblioteca
```

Expected: los cambios sin commitear de `docs/` y `.gitignore` viajan con la rama (no son de código).

---

### Task 1: Backend — `GET /api/exercises/library`

Todo en el worktree `C:\Users\igna_\Desktop\fittrainer-exercises-library\backend`.

**Files:**
- Create: `tests/helpers/exercises/exercises-service.setup.js`
- Create: `tests/unit/services/exercises/exercises.service/crud.test.js` (contenido movido de `exercises.service.test.js`)
- Create: `tests/unit/services/exercises/exercises.service/library.test.js`
- Delete: `tests/unit/services/exercises/exercises.service.test.js`
- Modify: `src/models/exercises/exercise.model.js`
- Modify: `src/repositories/exercises/exercises.repository.js`
- Modify: `src/services/exercises/exercises.service.js`
- Modify: `src/controllers/exercises/exercises.controller.js`
- Modify: `src/routes/exercises/exercises.routes.js`
- Modify: `README.md`

**Interfaces:**
- Produces: `GET /api/exercises/library` → `200 { data: [ { id, name, muscle_group, equipment, description, video_url } ] }`; 401 sin token, 403 si no es alumno, 404 si el alumno no existe. La Task 4 consume esta forma.

- [ ] **Step 1: Helper compartido de los tests del service**

`tests/helpers/exercises/exercises-service.setup.js`:

```js
import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks compartidos por los tests de exercises.service (divididos en
// tests/unit/services/exercises/exercises.service/). Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockRepo = {
  findExercises: jest.fn(),
  findExerciseById: jest.fn(),
  createExercise: jest.fn(),
  updateExercise: jest.fn(),
  deleteExercise: jest.fn(),
  findLibrary: jest.fn(),
};
jest.unstable_mockModule(src('repositories/exercises/exercises.repository.js'), () => mockRepo);

export const mockStudentsRepo = {
  findStudentById: jest.fn(),
};
jest.unstable_mockModule(src('repositories/students/students.repository.js'), () => mockStudentsRepo);

export const service = await import(src('services/exercises/exercises.service.js'));

export const TRAINER_ID = 'trainer-1';
export const OWN_EXERCISE = { id: 'ex-1', trainer_id: TRAINER_ID, name: 'Press banca', is_global: false };
export const GLOBAL_EXERCISE = { id: 'ex-2', trainer_id: null, name: 'Sentadilla', is_global: true };
```

- [ ] **Step 2: Mover los tests existentes**

Crear `tests/unit/services/exercises/exercises.service/crud.test.js` con **el mismo cuerpo** de `tests/unit/services/exercises/exercises.service.test.js` desde `describe('exercises.service', …)` hasta el final, pero reemplazando las primeras líneas (el `import { jest }`, el `mockRepo`, el `unstable_mockModule`, el `await import` y las tres constantes) por:

```js
import {
  mockRepo,
  service,
  TRAINER_ID,
  OWN_EXERCISE,
  GLOBAL_EXERCISE,
} from '../../../../helpers/exercises/exercises-service.setup.js';
```

Borrar `tests/unit/services/exercises/exercises.service.test.js`.

Run: `npm test -- exercises.service`
Expected: PASS, la misma cantidad de tests que antes.

- [ ] **Step 3: Test que falla del service**

`tests/unit/services/exercises/exercises.service/library.test.js`:

```js
import {
  mockRepo,
  mockStudentsRepo,
  service,
  TRAINER_ID,
} from '../../../../helpers/exercises/exercises-service.setup.js';

const LIBRARY = [{ id: 'ex-1', name: 'Press banca', muscle_group: 'chest', equipment: null, description: null, video_url: null }];

describe('exercises.service · library', () => {
  it('trae los globales y los del entrenador del alumno', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValueOnce({ id: 'st-1', trainer_id: TRAINER_ID });
    mockRepo.findLibrary.mockResolvedValueOnce(LIBRARY);

    expect(await service.library('st-1')).toEqual(LIBRARY);
    expect(mockStudentsRepo.findStudentById).toHaveBeenCalledWith('st-1');
    expect(mockRepo.findLibrary).toHaveBeenCalledWith(TRAINER_ID);
  });

  it('alumno sin entrenador: pide solo los globales', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValueOnce({ id: 'st-1', trainer_id: null });
    mockRepo.findLibrary.mockResolvedValueOnce([]);

    expect(await service.library('st-1')).toEqual([]);
    expect(mockRepo.findLibrary).toHaveBeenCalledWith(null);
  });

  it('lanza NOT_FOUND si el alumno del token no existe', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValueOnce(null);

    await expect(service.library('st-x')).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRepo.findLibrary).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Verlo fallar**

Run: `npm test -- exercises.service/library`
Expected: FAIL con `service.library is not a function`.

- [ ] **Step 5: Modelo, repository, service, controller y ruta**

En `src/models/exercises/exercise.model.js`, debajo de `EXERCISE_COLUMNS`:

```js
/** Columnas que ve el alumno en la biblioteca (sin trainer_id ni is_global). */
export const LIBRARY_COLUMNS = 'id, name, muscle_group, equipment, description, video_url';
```

En `src/repositories/exercises/exercises.repository.js`, sumar `LIBRARY_COLUMNS` al import del modelo y agregar debajo de `findExercises`:

```js
/**
 * Biblioteca de un alumno: los globales + los del entrenador (solo los globales si
 * trainerId es null). Solo columnas públicas, ordenada por nombre.
 */
export async function findLibrary(trainerId) {
  let query = supabase.from(EXERCISES_TABLE).select(LIBRARY_COLUMNS);
  query = trainerId
    ? query.or(`is_global.eq.true,trainer_id.eq.${trainerId}`)
    : query.eq('is_global', true);

  const { data, error } = await query.order('name');
  if (error) throw Errors.internal(error.message);
  return data;
}
```

En `src/services/exercises/exercises.service.js`, sumar el import y la función (debajo de `list`):

```js
import * as studentsRepository from '../../repositories/students/students.repository.js';
```

```js
/**
 * Biblioteca del alumno: globales + los de su entrenador. El trainer sale de la
 * fila del alumno, nunca del request: no puede ver la biblioteca de otro entrenador.
 */
export async function library(studentId) {
  const student = await studentsRepository.findStudentById(studentId);
  if (!student) throw Errors.notFound('Alumno no encontrado');
  return repository.findLibrary(student.trainer_id ?? null);
}
```

En `src/controllers/exercises/exercises.controller.js`, debajo de `list`:

```js
/** GET /exercises/library — biblioteca del alumno (globales + los de su entrenador). */
export const library = asyncHandler(async (req, res) => {
  const data = await exercisesService.library(req.user.id);
  res.json({ data });
});
```

En `src/routes/exercises/exercises.routes.js`, reemplazar el comentario y el `router.use` por:

```js
// Biblioteca del alumno — va antes del guard de trainer: esta ruta responde y la cadena termina acá.
router.get('/library', authenticate, requireRole('student'), exercisesController.library);

// El resto de la biblioteca de ejercicios es de uso del trainer.
router.use(authenticate, requireRole('trainer'));
```

- [ ] **Step 6: Verlo pasar**

Run: `npm test -- exercises.service`
Expected: PASS (crud + library).

- [ ] **Step 7: README para Pablo**

En `README.md`, en la tabla "### Ejercicios — Fase 2", debajo de la fila de `GET /api/exercises`:

```markdown
| GET | `/api/exercises/library` | student | Biblioteca del alumno: globales + los de su entrenador, ordenada por nombre. Solo `id, name, muscle_group, equipment, description, video_url`. Sin filtros (mobile filtra offline) |
```

En "## Desvíos respecto del contrato de API (Notion v1.1)", agregar al final de la sección:

```markdown
### Ejercicios (`/exercises`)

- **`GET /exercises/library` (nuevo, solo alumno):** lo usa la biblioteca offline de mobile. El entrenador sale de la ficha del alumno, no del request. Un alumno sin entrenador recibe solo los globales; uno que no existe, 404. **Para la web: nada que hacer**, `GET /exercises` sigue igual y solo para trainer.
```

- [ ] **Step 8: Lint y tests completos**

Run: `npm run lint && npm test`
Expected: todo en verde, sin archivos de más de 200 líneas.

- [ ] **Step 9: Prueba con curl** (backend levantado con `npm run dev`; tokens de `POST /api/auth/login` con `profe.card8@test.com` y `alumna.card8@test.com`, contraseña `Prueba1234`)

```bash
curl -s -H "Authorization: Bearer $ALUMNA" http://localhost:3001/api/exercises/library | head -c 600
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $PROFE" http://localhost:3001/api/exercises/library
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/exercises/library
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $PROFE" http://localhost:3001/api/exercises
```

Expected: la alumna recibe `{ "data": [...] }` con globales y los propios de `profe.card8`, sin `trainer_id` ni `is_global`; el trainer en `/library` recibe `403`; sin token, `401`; el trainer en `/exercises` sigue con `200`. Si se tiene a mano un ejercicio propio de **otro** entrenador, confirmar que no aparece.

- [ ] **Step 10: Commit** (lo resuelve Igna)

```bash
git add -A
git commit -m "feat(exercises): GET /exercises/library con la biblioteca del alumno para el caché offline de mobile"
```

---

### Task 2: Mobile — componentes de ejercicio compartidos

Refactor sin cambio de comportamiento (salvo el aviso del video sin red, ver desvíos). Rutas relativas a `mobile/app/src/`.

**Files:**
- Create: `main/java/com/fittrainer/ui/components/exercise/ExerciseTexts.kt`
- Create: `main/java/com/fittrainer/ui/components/exercise/ExerciseDetail.kt`
- Create: `main/java/com/fittrainer/ui/components/exercise/ExerciseRow.kt` (movido de `ui/today/components/`)
- Create: `main/java/com/fittrainer/ui/components/exercise/ExerciseDetailSheet.kt` (movido de `ui/today/components/`)
- Create: `main/java/com/fittrainer/ui/components/StatusViews.kt`
- Delete: `main/java/com/fittrainer/ui/today/components/ExerciseRow.kt`, `main/java/com/fittrainer/ui/today/components/ExerciseDetailSheet.kt`
- Modify: `main/java/com/fittrainer/ui/today/RoutineTexts.kt`, `ui/today/TodayScreen.kt`, `ui/today/components/TodayHeader.kt`, `ui/today/components/TodayStates.kt`
- Create: `test/java/com/fittrainer/ui/components/exercise/ExerciseTextsTest.kt`
- Create: `test/java/com/fittrainer/ui/today/TodayDetailTest.kt`
- Modify: `test/java/com/fittrainer/ui/today/RoutineTextsTest.kt`

**Interfaces:**
- Produces (paquete `com.fittrainer.ui.components.exercise`):
  - `val MUSCLE_ORDER: List<String>`, `fun muscleLabel(raw: String?): String`, `fun formatKg(kg: Double): String`
  - `data class ExerciseDetail(name, muscleGroup, equipment, videoUrl, description = null, sets = null, reps = null, suggestedKg = null, tempo = null, restSeconds = null, notes = null)`
  - `@Composable fun ExerciseRow(title: String, subtitle: String, onClick: () -> Unit)`
  - `@Composable fun ExerciseDetailSheet(detail: ExerciseDetail, canOpenVideo: Boolean, onDismiss: () -> Unit)`
  - `const val VIDEO_NEEDS_CONNECTION = "El video necesita conexión"`
- Produces (paquete `com.fittrainer.ui.components`): `InfoCard(title, message)`, `NoticeBanner(message, onDismiss)`, `OfflineIndicator(text)`
- Produces (paquete `com.fittrainer.ui.today`): `fun RoutineExercise.toDetail(): ExerciseDetail`

- [ ] **Step 1: Tests que fallan**

`test/java/com/fittrainer/ui/components/exercise/ExerciseTextsTest.kt`:

```kotlin
package com.fittrainer.ui.components.exercise

import org.junit.Assert.assertEquals
import org.junit.Test

class ExerciseTextsTest {

    @Test fun `musculos traducidos y desconocido tal cual`() {
        assertEquals("Pecho", muscleLabel("chest"))
        assertEquals("Cuerpo completo", muscleLabel("full_body"))
        assertEquals("pantorrilla", muscleLabel("pantorrilla"))
        assertEquals("", muscleLabel(null))
    }

    @Test fun `kilos sin decimales de mas`() {
        assertEquals("40 kg", formatKg(40.0))
        assertEquals("2,5 kg", formatKg(2.5))
    }

    @Test fun `orden de los grupos igual al del backend`() {
        assertEquals(
            listOf("chest", "back", "shoulders", "legs", "glutes", "biceps", "triceps", "core", "calves", "full_body", "cardio"),
            MUSCLE_ORDER,
        )
    }
}
```

`test/java/com/fittrainer/ui/today/TodayDetailTest.kt`:

```kotlin
package com.fittrainer.ui.today

import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.ui.components.exercise.ExerciseDetail
import org.junit.Assert.assertEquals
import org.junit.Test

class TodayDetailTest {

    @Test fun `el detalle de Hoy lleva la prescripcion y no descripcion`() {
        val exercise = RoutineExercise(
            "re-1", "ex-1", "Press", "chest", "Barra", "https://v", 4, 8, 90, 40.0, "3-1-1", "Codos cerrados",
        )
        assertEquals(
            ExerciseDetail(
                name = "Press", muscleGroup = "chest", equipment = "Barra", videoUrl = "https://v",
                sets = 4, reps = 8, suggestedKg = 40.0, tempo = "3-1-1", restSeconds = 90, notes = "Codos cerrados",
            ),
            exercise.toDetail(),
        )
    }
}
```

En `test/java/com/fittrainer/ui/today/RoutineTextsTest.kt`, borrar los tests `musculos traducidos y desconocido tal cual` y `kilos sin decimales de mas` (se mudaron a `ExerciseTextsTest`).

- [ ] **Step 2: Verlos fallar**

Run: `./gradlew testDebugUnitTest --tests "*ExerciseTextsTest" --tests "*TodayDetailTest"`
Expected: FAIL de compilación (`MUSCLE_ORDER`, `ExerciseDetail` y `toDetail` no existen).

- [ ] **Step 3: Textos y modelo de detalle**

`main/java/com/fittrainer/ui/components/exercise/ExerciseTexts.kt`:

```kotlin
package com.fittrainer.ui.components.exercise

/** En el mismo orden que MUSCLE_GROUPS del backend (exercise.model.js). */
private val MUSCLES = linkedMapOf(
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

/** Orden de los chips de la biblioteca. */
val MUSCLE_ORDER: List<String> = MUSCLES.keys.toList()

fun muscleLabel(raw: String?): String = raw?.let { MUSCLES[it] ?: it }.orEmpty()

/** 40.0 → "40 kg"; 2.5 → "2,5 kg" (coma decimal). */
fun formatKg(kg: Double): String =
    if (kg % 1.0 == 0.0) "${kg.toInt()} kg" else "${kg.toString().replace('.', ',')} kg"
```

`main/java/com/fittrainer/ui/components/exercise/ExerciseDetail.kt`:

```kotlin
package com.fittrainer.ui.components.exercise

/**
 * Lo que muestra la hoja de detalle. La prescripción (series, reps, nota…) solo viene de Hoy;
 * la descripción, de la biblioteca. Lo que es null no se muestra.
 */
data class ExerciseDetail(
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val videoUrl: String?,
    val description: String? = null,
    val sets: Int? = null,
    val reps: Int? = null,
    val suggestedKg: Double? = null,
    val tempo: String? = null,
    val restSeconds: Int? = null,
    val notes: String? = null,
)
```

En `main/java/com/fittrainer/ui/today/RoutineTexts.kt`: borrar el mapa `MUSCLES`, `muscleLabel` y `formatKg`; sumar `import com.fittrainer.ui.components.exercise.ExerciseDetail` y `import com.fittrainer.ui.components.exercise.muscleLabel`, y al final:

```kotlin
fun RoutineExercise.toDetail() = ExerciseDetail(
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
    videoUrl = videoUrl,
    sets = sets,
    reps = reps,
    suggestedKg = suggestedKg,
    tempo = tempo,
    restSeconds = restSeconds,
    notes = notes,
)
```

- [ ] **Step 4: Avisos compartidos**

`main/java/com/fittrainer/ui/components/StatusViews.kt`: mover **tal cual** `InfoCard` (de `TodayStates.kt`, ahora público), `OfflineIndicator` (de `TodayHeader.kt`, ahora público) y `NoticeBanner` (de `TodayHeader.kt`), con `package com.fittrainer.ui.components` y sus imports. Mantener los comentarios ("Ninguno de estos estados es un error: nada de rojo." y "Discreto a propósito…").

En `TodayStates.kt` y `TodayHeader.kt`: borrar las funciones movidas y sumar `import com.fittrainer.ui.components.InfoCard` / `import com.fittrainer.ui.components.OfflineIndicator` donde se usan. Limpiar los imports que queden sin uso.

- [ ] **Step 5: Fila y hoja compartidas**

`main/java/com/fittrainer/ui/components/exercise/ExerciseRow.kt`: mover `SectionLabel` y `ExerciseRow` de `ui/today/components/ExerciseRow.kt` con `package com.fittrainer.ui.components.exercise`. `ExerciseRow` cambia de firma:

```kotlin
@Composable
fun ExerciseRow(title: String, subtitle: String, onClick: () -> Unit) {
    // …mismo Row que antes…
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(title, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
            if (subtitle.isNotEmpty()) {
                Text(subtitle, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
            }
        }
    // …mismo Icon que antes…
}
```

(Se borran los imports de `RoutineExercise` y `exerciseSubtitle`.)

`main/java/com/fittrainer/ui/components/exercise/ExerciseDetailSheet.kt`:

```kotlin
package com.fittrainer.ui.components.exercise

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

const val VIDEO_NEEDS_CONNECTION = "El video necesita conexión"

/** Detalle del ejercicio. El video es un link externo: con red se abre; sin red, se avisa. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseDetailSheet(detail: ExerciseDetail, canOpenVideo: Boolean, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = FtColors.Surface) {
        Column(
            Modifier
                .fillMaxWidth()
                // Notas largas o fuente grande: que "Ver video" siga siendo alcanzable.
                .verticalScroll(rememberScrollState())
                .padding(horizontal = Spacing.lg)
                .padding(bottom = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            Text(detail.name, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            val muscle = muscleLabel(detail.muscleGroup)
            if (muscle.isNotEmpty()) {
                Text(muscle.uppercase(), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
            }
            DetailLine("Series", detail.sets?.toString())
            DetailLine("Repeticiones", detail.reps?.toString())
            DetailLine("Peso sugerido", detail.suggestedKg?.let(::formatKg))
            DetailLine("Tempo", detail.tempo)
            DetailLine("Descanso", detail.restSeconds?.let { "$it s" })
            DetailLine("Equipo", detail.equipment)
            DetailBlock("DESCRIPCIÓN", detail.description)
            DetailBlock("NOTA DEL ENTRENADOR", detail.notes)
            VideoAction(detail.videoUrl, canOpenVideo)
        }
    }
}

@Composable
private fun VideoAction(video: String?, canOpenVideo: Boolean) {
    if (video.isNullOrBlank()) return
    if (!canOpenVideo) {
        Text(VIDEO_NEEDS_CONNECTION, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        return
    }
    val uriHandler = LocalUriHandler.current
    OutlinedButton(
        // Sin app que abra el link, no se hace nada (no se rompe la pantalla).
        onClick = { runCatching { uriHandler.openUri(video) } },
        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
    ) { Text("Ver video") }
}

@Composable
private fun DetailBlock(label: String, text: String?) {
    if (text.isNullOrBlank()) return
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        Text(text, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
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

Borrar `ui/today/components/ExerciseRow.kt` y `ui/today/components/ExerciseDetailSheet.kt`.

- [ ] **Step 6: Hoy usa los compartidos**

En `ui/today/TodayScreen.kt`:
- imports: `com.fittrainer.ui.components.NoticeBanner`, `com.fittrainer.ui.components.exercise.ExerciseDetailSheet`, `com.fittrainer.ui.components.exercise.ExerciseRow`, `com.fittrainer.ui.components.exercise.SectionLabel` en lugar de los de `ui.today.components`;
- la fila: `ExerciseRow(exercise.name, exerciseSubtitle(exercise), onClick = { onExerciseClick(exercise) })`;
- la hoja: `ExerciseDetailSheet(exercise.toDetail(), canOpenVideo = !state.isOffline, onDismiss = { selected = null })`.

Buscar otros usos: `grep -rn "today.components.ExerciseRow\|today.components.SectionLabel\|today.components.NoticeBanner\|today.muscleLabel\|today.formatKg" mobile/app/src` → tiene que quedar vacío.

- [ ] **Step 7: Verlos pasar y compilar**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL, todos los tests en verde (incluidos `RoutineTextsTest`, `TodayViewModelTest`, `ExerciseTextsTest`, `TodayDetailTest`).

- [ ] **Step 8: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src
git commit -m "refactor(mobile): fila, detalle de ejercicio y avisos pasan a ui/components para compartirlos con la biblioteca"
```

---

### Task 3: Mobile — el logout limpia todos los cachés

**Files:**
- Modify: `main/java/com/fittrainer/data/session/TokenSessionRepository.kt`
- Modify: `main/java/com/fittrainer/di/RoutineModule.kt`
- Modify: `test/java/com/fittrainer/data/session/TokenSessionRepositoryTest.kt`
- Modify: `test/java/com/fittrainer/data/session/SignOutCacheTest.kt` (solo el constructor)

**Interfaces:**
- Produces: `TokenSessionRepository(tokenStore, authRepository, userDataCleaners: Set<@JvmSuppressWildcards UserDataCleaner>)`. Cada `UserDataCleaner` se registra con `@Binds @IntoSet` en el módulo de DI de su feature. La Task 4 registra el de la biblioteca.

- [ ] **Step 1: Tests que fallan**

En `TokenSessionRepositoryTest.kt`:
- el campo `repo` pasa a `TokenSessionRepository(store, AuthRepository(api, store, fixedClock()), setOf(cleaner, other))`, con `private val other = FakeCleaner()` declarado debajo de `cleaner`;
- sumar:

```kotlin
    @Test fun `signOut borra los datos de todos los caches`() = runTest {
        store.save(authState())
        repo.signOut()
        assertEquals(1, cleaner.calls)
        assertEquals(1, other.calls)
    }

    // Review Focus 5: un caché que no se pudo borrar no deja a los demás con datos del que se fue.
    @Test fun `si un borrado falla los demas igual se borran`() = runTest {
        store.save(authState())
        cleaner.error = IllegalStateException("disco")
        assertEquals(LogoutResult.Closed, repo.signOut())
        assertEquals(1, other.calls)
        assertEquals(Session.LoggedOut, repo.session.first())
    }
```

En `SignOutCacheTest.kt`: el constructor pasa a `TokenSessionRepository(store, AuthRepository(authApi, store, fixedClock()), setOf(routines))`.

- [ ] **Step 2: Verlos fallar**

Run: `./gradlew testDebugUnitTest --tests "*TokenSessionRepositoryTest" --tests "*SignOutCacheTest"`
Expected: FAIL de compilación (el constructor todavía recibe un solo `UserDataCleaner`).

- [ ] **Step 3: Implementación**

`TokenSessionRepository.kt`: el tercer parámetro pasa a `private val userDataCleaners: Set<@JvmSuppressWildcards UserDataCleaner>` y el bloque de borrado de `signOut()` a:

```kotlin
        // Cada caché por separado: si uno falla, los demás igual se borran.
        userDataCleaners.forEach { cleaner ->
            try {
                cleaner.clearUserData(ownerId)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Sin acción: ver el comentario de la función.
            }
        }
```

En el KDoc de `signOut()`, cambiar "Si el borrado falla" por "Si algún borrado falla".

`RoutineModule.kt`: reemplazar el `@Binds` del cleaner por:

```kotlin
    @Binds
    @IntoSet
    abstract fun bindRoutineCleaner(impl: RoutineRepository): UserDataCleaner
```

con `import dagger.multibindings.IntoSet`.

- [ ] **Step 4: Verlos pasar y compilar**

Run: `./gradlew assembleDebug testDebugUnitTest --tests "*TokenSessionRepositoryTest" --tests "*SignOutCacheTest"`
Expected: PASS y Hilt compila (el `Set` se arma con un solo elemento hasta la Task 4).

- [ ] **Step 5: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src
git commit -m "refactor(mobile): el logout borra todos los cachés registrados (UserDataCleaner con multibinding)"
```

---

### Task 4: Mobile — datos de la biblioteca (API, Room v3, repositorio)

**Files:**
- Create: `main/java/com/fittrainer/data/api/ExerciseApi.kt`
- Create: `main/java/com/fittrainer/data/db/library/LibraryEntities.kt`
- Create: `main/java/com/fittrainer/data/db/library/LibraryDao.kt`
- Create: `main/java/com/fittrainer/data/library/LibraryExercise.kt`
- Create: `main/java/com/fittrainer/data/library/LibraryMapper.kt`
- Create: `main/java/com/fittrainer/data/library/LibraryRepository.kt`
- Create: `main/java/com/fittrainer/di/LibraryModule.kt`
- Modify: `main/java/com/fittrainer/data/db/FitTrainerDatabase.kt`, `di/DatabaseModule.kt`, `di/NetworkModule.kt`
- Generated: `mobile/app/schemas/com.fittrainer.data.db.FitTrainerDatabase/3.json` (se commitea)
- Create: `test/java/com/fittrainer/testing/fakes/library/FakeLibrary.kt`
- Create: `test/java/com/fittrainer/testing/fakes/library/FakeLibraryDao.kt`
- Create: `test/java/com/fittrainer/data/library/LibraryMapperTest.kt`
- Create: `test/java/com/fittrainer/data/library/LibraryRepositoryTest.kt`
- Modify: `test/java/com/fittrainer/data/session/SignOutCacheTest.kt`
- Create: `androidTest/java/com/fittrainer/data/db/library/LibraryDaoTest.kt`
- Modify: `androidTest/java/com/fittrainer/data/db/FitTrainerDatabaseMigrationTest.kt`

**Interfaces:**
- Consumes: `GET exercises/library` (Task 1); `UserDataCleaner` con `@IntoSet` (Task 3); `DataException`, `toDataError()` de `data/repository/`.
- Produces:
  - `data class LibraryExercise(id: String, name: String, muscleGroup: String?, equipment: String?, description: String?, videoUrl: String?)`
  - `data class LibraryCache(exercises: List<LibraryExercise>, lastSyncedAt: Instant?)`
  - `class LibraryRepository { fun observeCache(ownerId: String): Flow<LibraryCache>; suspend fun refresh(ownerId: String): Result<Unit>; override suspend fun clearUserData(ownerId: String?) }`

- [ ] **Step 1: API, entidades y DAO**

`main/java/com/fittrainer/data/api/ExerciseApi.kt`:

```kotlin
package com.fittrainer.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET

/** Biblioteca del alumno logueado: globales + los de su entrenador (va por el cliente con Bearer). */
interface ExerciseApi {
    @GET("exercises/library")
    suspend fun library(): LibraryResponse
}

@Serializable
data class LibraryResponse(val data: List<LibraryExerciseDto> = emptyList())

@Serializable
data class LibraryExerciseDto(
    val id: String,
    val name: String,
    @SerialName("muscle_group") val muscleGroup: String? = null,
    val equipment: String? = null,
    val description: String? = null,
    @SerialName("video_url") val videoUrl: String? = null,
)
```

`main/java/com/fittrainer/data/db/library/LibraryEntities.kt`:

```kotlin
package com.fittrainer.data.db.library

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Un ejercicio de la biblioteca. position = orden en que lo mandó el backend (por nombre). */
@Entity(tableName = "library_exercises")
data class LibraryExerciseEntity(
    @PrimaryKey val id: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val description: String?,
    val videoUrl: String?,
    val position: Int,
)

/** Última sincronización buena. Una sola fila (id = 0). ownerId = alumno dueño del caché. */
@Entity(tableName = "library_sync")
data class LibrarySyncEntity(
    @PrimaryKey val id: Int = 0,
    val ownerId: String,
    val lastSyncedAt: Long,
)

/** Lo que hay en el caché para su dueño, leído en una sola transacción. */
data class LibrarySnapshot(
    val sync: LibrarySyncEntity,
    val exercises: List<LibraryExerciseEntity>,
)
```

`main/java/com/fittrainer/data/db/library/LibraryDao.kt`:

```kotlin
package com.fittrainer.data.db.library

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Caché de la biblioteca. Mismo contrato que RoutineDao: se reemplaza entera y tiene dueño. */
@Dao
abstract class LibraryDao {

    @Query("SELECT * FROM library_exercises ORDER BY position")
    abstract fun observeExercises(): Flow<List<LibraryExerciseEntity>>

    @Query("SELECT * FROM library_sync WHERE id = 0")
    abstract fun observeSync(): Flow<LibrarySyncEntity?>

    @Query("SELECT * FROM library_exercises ORDER BY position")
    abstract suspend fun getExercises(): List<LibraryExerciseEntity>

    @Query("SELECT * FROM library_sync WHERE id = 0")
    abstract suspend fun getSync(): LibrarySyncEntity?

    @Insert
    abstract suspend fun insertExercises(exercises: List<LibraryExerciseEntity>)

    @Upsert
    abstract suspend fun upsertSync(sync: LibrarySyncEntity)

    @Query("DELETE FROM library_exercises")
    abstract suspend fun deleteExercises()

    @Query("DELETE FROM library_sync")
    abstract suspend fun deleteSync()

    /** Todo o nada: si algo falla a mitad de camino, queda el caché anterior. */
    @Transaction
    open suspend fun replaceAll(sync: LibrarySyncEntity, exercises: List<LibraryExerciseEntity>) {
        deleteExercises()
        insertExercises(exercises)
        upsertSync(sync)
    }

    @Transaction
    open suspend fun clear() {
        deleteExercises()
        deleteSync()
    }

    /** Dueño y ejercicios leídos juntos. null si el caché no es de [ownerId] (ver RoutineDao.snapshot). */
    @Transaction
    open suspend fun snapshot(ownerId: String): LibrarySnapshot? {
        val sync = getSync()?.takeIf { it.ownerId == ownerId } ?: return null
        return LibrarySnapshot(sync, getExercises())
    }

    /** Borra el caché solo si sigue siendo de [ownerId]: un logout que termina tarde no toca el del siguiente. */
    @Transaction
    open suspend fun clearIfOwner(ownerId: String) {
        if (getSync()?.ownerId == ownerId) clear()
    }
}
```

- [ ] **Step 2: Room v3**

`FitTrainerDatabase.kt`: sumar `LibraryExerciseEntity::class` y `LibrarySyncEntity::class` a `entities`, `version = 3`, `autoMigrations = [AutoMigration(from = 1, to = 2), AutoMigration(from = 2, to = 3)]` y `abstract fun libraryDao(): LibraryDao` (con sus imports).

`DatabaseModule.kt`:

```kotlin
    @Provides
    fun provideLibraryDao(db: FitTrainerDatabase): LibraryDao = db.libraryDao()
```

`NetworkModule.kt`, debajo de `provideRoutineApi`:

```kotlin
    @Provides
    @Singleton
    fun provideExerciseApi(client: OkHttpClient, json: Json): ExerciseApi =
        retrofit(client, json).create(ExerciseApi::class.java)
```

- [ ] **Step 3: Tests que fallan (mapper y repositorio)**

`test/java/com/fittrainer/testing/fakes/library/FakeLibrary.kt`:

```kotlin
package com.fittrainer.testing.fakes.library

import com.fittrainer.data.api.ExerciseApi
import com.fittrainer.data.api.LibraryExerciseDto
import com.fittrainer.data.api.LibraryResponse
import kotlinx.coroutines.CompletableDeferred

fun libraryDto(id: String = "ex-1", muscle: String? = "chest", video: String? = null) = LibraryExerciseDto(
    id = id, name = "Ejercicio $id", muscleGroup = muscle, equipment = "Barra", description = "Desc $id", videoUrl = video,
)

/** API falsa: devuelve [response] o lanza [error]. Si [gate] no es null, espera a que se complete. */
class FakeExerciseApi(
    var response: LibraryResponse = LibraryResponse(listOf(libraryDto())),
    var error: Throwable? = null,
) : ExerciseApi {
    var calls = 0
    var gate: CompletableDeferred<Unit>? = null

    override suspend fun library(): LibraryResponse {
        calls++
        gate?.await()
        error?.let { throw it }
        return response
    }
}
```

`test/java/com/fittrainer/testing/fakes/library/FakeLibraryDao.kt`:

```kotlin
package com.fittrainer.testing.fakes.library

import com.fittrainer.data.db.library.LibraryDao
import com.fittrainer.data.db.library.LibraryExerciseEntity
import com.fittrainer.data.db.library.LibrarySyncEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/** DAO falso en memoria. replaceAll, clear, clearIfOwner y snapshot son los del LibraryDao real. */
class FakeLibraryDao : LibraryDao() {

    data class State(val exercises: List<LibraryExerciseEntity> = emptyList(), val sync: LibrarySyncEntity? = null)

    val state = MutableStateFlow(State())

    override fun observeExercises(): Flow<List<LibraryExerciseEntity>> =
        state.map { s -> s.exercises.sortedBy { it.position } }.distinctUntilChanged()
    override fun observeSync(): Flow<LibrarySyncEntity?> = state.map { it.sync }.distinctUntilChanged()
    override suspend fun getExercises() = state.value.exercises.sortedBy { it.position }
    override suspend fun getSync() = state.value.sync
    override suspend fun insertExercises(exercises: List<LibraryExerciseEntity>) {
        state.value = state.value.let { it.copy(exercises = it.exercises + exercises) }
    }
    override suspend fun upsertSync(sync: LibrarySyncEntity) {
        state.value = state.value.copy(sync = sync)
    }
    override suspend fun deleteExercises() {
        state.value = state.value.copy(exercises = emptyList())
    }
    override suspend fun deleteSync() {
        state.value = state.value.copy(sync = null)
    }
}
```

`test/java/com/fittrainer/data/library/LibraryMapperTest.kt`:

```kotlin
package com.fittrainer.data.library

import com.fittrainer.testing.fakes.library.libraryDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LibraryMapperTest {

    @Test fun `la posicion es el orden en que llego del backend`() {
        val entities = listOf(libraryDto("b"), libraryDto("a")).toEntities()
        assertEquals(listOf("b" to 0, "a" to 1), entities.map { it.id to it.position })
    }

    @Test fun `entidad a dominio conserva todos los campos`() {
        val exercise = listOf(libraryDto("ex-1", video = "https://v")).toEntities().single().toDomain()
        assertEquals(
            LibraryExercise("ex-1", "Ejercicio ex-1", "chest", "Barra", "Desc ex-1", "https://v"),
            exercise,
        )
    }

    // Review Focus 3: un PATCH con "" deja el video en blanco; no se ofrece un link roto.
    @Test fun `video en blanco se guarda como null`() {
        assertNull(listOf(libraryDto(video = "  ")).toEntities().single().videoUrl)
    }
}
```

`test/java/com/fittrainer/data/library/LibraryRepositoryTest.kt`:

```kotlin
package com.fittrainer.data.library

import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.library.libraryDto
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LibraryRepositoryTest {

    private val clock = Clock.fixed(Instant.ofEpochMilli(5_000L), ZoneOffset.UTC)
    private val api = FakeExerciseApi()
    private val dao = FakeLibraryDao()
    private val repo = LibraryRepository(api, dao, clock)

    @Test fun `sin sync el cache sale vacio y sin fecha`() = runTest {
        val cache = repo.observeCache("u1").first()
        assertTrue(cache.exercises.isEmpty())
        assertNull(cache.lastSyncedAt)
    }

    @Test fun `refresh guarda la biblioteca con su duenio y la hora del dispositivo`() = runTest {
        api.response = LibraryResponse(listOf(libraryDto("ex-1"), libraryDto("ex-2")))
        assertTrue(repo.refresh("u1").isSuccess)

        val cache = repo.observeCache("u1").first()
        assertEquals(listOf("ex-1", "ex-2"), cache.exercises.map { it.id })
        assertEquals(Instant.ofEpochMilli(5_000L), cache.lastSyncedAt)
    }

    @Test fun `refresh reemplaza todo y un ejercicio borrado desaparece`() = runTest {
        api.response = LibraryResponse(listOf(libraryDto("ex-1"), libraryDto("ex-2")))
        repo.refresh("u1")
        api.response = LibraryResponse(listOf(libraryDto("ex-2")))
        repo.refresh("u1")

        assertEquals(listOf("ex-2"), repo.observeCache("u1").first().exercises.map { it.id })
    }

    @Test fun `refresh sin red devuelve Offline y no toca el cache`() = runTest {
        repo.refresh("u1")
        api.error = IOException("sin red")

        val result = repo.refresh("u1")

        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals(listOf("ex-1"), repo.observeCache("u1").first().exercises.map { it.id })
    }

    @Test fun `el cache de otro usuario se ve como nunca sincronizado`() = runTest {
        repo.refresh("u1")

        val other = repo.observeCache("u2").first()
        assertTrue(other.exercises.isEmpty())
        assertNull(other.lastSyncedAt)
    }

    @Test fun `clearUserData borra solo si el cache es de ese usuario`() = runTest {
        repo.refresh("u1")
        repo.clearUserData("u2")
        assertEquals(1, repo.observeCache("u1").first().exercises.size)

        repo.clearUserData("u1")
        assertTrue(repo.observeCache("u1").first().exercises.isEmpty())
    }

    // Review Focus 1: el refresh que termina después del logout queda con el dueño viejo.
    @Test fun `refresh que termina despues de cerrar sesion no se le muestra a otro`() =
        runTest(UnconfinedTestDispatcher()) {
            val gate = CompletableDeferred<Unit>()
            api.gate = gate
            val inFlight = launch { repo.refresh("u1") }

            repo.clearUserData("u1")
            gate.complete(Unit)
            inFlight.join()

            val next = repo.observeCache("u2").first()
            assertTrue(next.exercises.isEmpty())
            assertNull(next.lastSyncedAt)
        }
}
```

- [ ] **Step 4: Verlos fallar**

Run: `./gradlew testDebugUnitTest --tests "*LibraryMapperTest" --tests "*LibraryRepositoryTest"`
Expected: FAIL de compilación (`LibraryExercise`, `toEntities`, `LibraryRepository` no existen).

- [ ] **Step 5: Dominio, mapper y repositorio**

`main/java/com/fittrainer/data/library/LibraryExercise.kt`:

```kotlin
package com.fittrainer.data.library

import java.time.Instant

/** Un ejercicio de la biblioteca, tal como lo ve la app (sin nada de Retrofit ni Room). */
data class LibraryExercise(
    val id: String,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val description: String?,
    val videoUrl: String?,
)

/** Caché de un alumno. lastSyncedAt == null: nunca sincronizó (o lo guardado es de otro usuario). */
data class LibraryCache(val exercises: List<LibraryExercise>, val lastSyncedAt: Instant?)
```

`main/java/com/fittrainer/data/library/LibraryMapper.kt`:

```kotlin
package com.fittrainer.data.library

import com.fittrainer.data.api.LibraryExerciseDto
import com.fittrainer.data.db.library.LibraryExerciseEntity

/** La posición es el índice en la respuesta: el backend ya la manda ordenada por nombre. */
fun List<LibraryExerciseDto>.toEntities(): List<LibraryExerciseEntity> = mapIndexed { index, dto ->
    LibraryExerciseEntity(
        id = dto.id,
        name = dto.name,
        muscleGroup = dto.muscleGroup?.takeIf { it.isNotBlank() },
        equipment = dto.equipment?.takeIf { it.isNotBlank() },
        description = dto.description?.takeIf { it.isNotBlank() },
        videoUrl = dto.videoUrl?.takeIf { it.isNotBlank() },
        position = index,
    )
}

fun LibraryExerciseEntity.toDomain() = LibraryExercise(
    id = id,
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
    description = description,
    videoUrl = videoUrl,
)
```

`main/java/com/fittrainer/data/library/LibraryRepository.kt`:

```kotlin
package com.fittrainer.data.library

import com.fittrainer.data.api.ExerciseApi
import com.fittrainer.data.db.library.LibraryDao
import com.fittrainer.data.db.library.LibrarySyncEntity
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.mapLatest

/**
 * Offline-first, igual que RoutineRepository: la UI observa Room; refresh() trae de la API y
 * reemplaza el caché entero. Lo guardado para otro alumno se ve como "nunca sincronizó".
 */
@Singleton
class LibraryRepository @Inject constructor(
    private val api: ExerciseApi,
    private val dao: LibraryDao,
    private val clock: Clock,
) : UserDataCleaner {

    /** Cada emisión es una lectura transaccional de dueño + ejercicios ([LibraryDao.snapshot]). */
    @OptIn(ExperimentalCoroutinesApi::class)
    fun observeCache(ownerId: String): Flow<LibraryCache> =
        combine(dao.observeSync(), dao.observeExercises()) { _, _ -> }
            .mapLatest {
                val snapshot = dao.snapshot(ownerId) ?: return@mapLatest LibraryCache(emptyList(), null)
                LibraryCache(snapshot.exercises.map { it.toDomain() }, Instant.ofEpochMilli(snapshot.sync.lastSyncedAt))
            }
            .distinctUntilChanged()

    /** Si falla, Room queda como estaba y el error viaja en un [DataException]. */
    suspend fun refresh(ownerId: String): Result<Unit> = try {
        val exercises = api.library().data
        dao.replaceAll(LibrarySyncEntity(ownerId = ownerId, lastSyncedAt = clock.millis()), exercises.toEntities())
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearIfOwner(ownerId)
    }
}
```

`main/java/com/fittrainer/di/LibraryModule.kt`:

```kotlin
package com.fittrainer.di

import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

@Module
@InstallIn(SingletonComponent::class)
abstract class LibraryModule {

    @Binds
    @IntoSet
    abstract fun bindLibraryCleaner(impl: LibraryRepository): UserDataCleaner
}
```

- [ ] **Step 6: El logout borra los dos cachés reales**

En `SignOutCacheTest.kt`, sumar el campo `private val library = LibraryRepository(FakeExerciseApi(), FakeLibraryDao(), fixedClock())`, pasar `setOf(routines, library)` al constructor (con los imports de `LibraryRepository`, `FakeExerciseApi` y `FakeLibraryDao`) y agregar:

```kotlin
    @Test fun `cerrar sesion deja vacia tambien la biblioteca`() = runTest {
        store.save(authState())
        library.refresh(authState().user.id)

        sessions.signOut()

        assertTrue(library.observeCache(authState().user.id).first().exercises.isEmpty())
    }
```

Si el archivo pasa de 200 líneas, este test va en `test/java/com/fittrainer/data/session/SignOutLibraryCacheTest.kt` con el mismo armado.

- [ ] **Step 7: Verlos pasar y compilar** (genera `schemas/…/3.json`)

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL; existe `mobile/app/schemas/com.fittrainer.data.db.FitTrainerDatabase/3.json` con `library_exercises` y `library_sync`.

- [ ] **Step 8: Tests instrumentados (DAO y migración)**

`androidTest/java/com/fittrainer/data/db/library/LibraryDaoTest.kt`:

```kotlin
package com.fittrainer.data.db.library

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
class LibraryDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: LibraryDao

    private fun exercise(id: String, position: Int) =
        LibraryExerciseEntity(id, "Ejercicio $id", "chest", null, null, null, position)

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java,
        ).build()
        dao = db.libraryDao()
    }

    @After fun tearDown() = db.close()

    @Test fun replaceAllReemplazaTodoYOrdenaPorPosicion() = runTest {
        dao.replaceAll(LibrarySyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(exercise("a", 0)))
        dao.replaceAll(LibrarySyncEntity(ownerId = "u1", lastSyncedAt = 2L), listOf(exercise("c", 1), exercise("b", 0)))

        assertEquals(listOf("b", "c"), dao.observeExercises().first().map { it.id })
        assertEquals(2L, dao.observeSync().first()?.lastSyncedAt)
    }

    @Test fun snapshotDeOtroDuenioEsNull() = runTest {
        dao.replaceAll(LibrarySyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(exercise("a", 0)))

        assertNull(dao.snapshot("u2"))
        assertEquals(listOf("a"), dao.snapshot("u1")?.exercises?.map { it.id })
    }

    @Test fun clearIfOwnerSoloBorraElCacheDeEseDuenio() = runTest {
        dao.replaceAll(LibrarySyncEntity(ownerId = "u1", lastSyncedAt = 1L), listOf(exercise("a", 0)))

        dao.clearIfOwner("u2")
        assertEquals(1, dao.getExercises().size)

        dao.clearIfOwner("u1")
        assertTrue(dao.getExercises().isEmpty())
        assertNull(dao.getSync())
    }
}
```

En `FitTrainerDatabaseMigrationTest.kt`, sumar:

```kotlin
    @Test fun migra2a3ConservandoLosDatos() {
        helper.createDatabase(DB, 2).apply {
            execSQL("INSERT INTO routines (id, name, goal, days, createdAt) VALUES ('rt-1', 'Rutina', NULL, 'monday', 1)")
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 3, true)

        db.query("SELECT name FROM routines WHERE id = 'rt-1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("Rutina", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM library_exercises").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }
```

y en `laBaseRealAbreUnaV1Existente` cambiar la consulta a `SELECT COUNT(*) FROM library_sync` (así prueba la cadena 1→2→3 entera).

Run (emulador prendido): `./gradlew connectedDebugAndroidTest`
Expected: PASS, incluidos `LibraryDaoTest`, `RoutineDaoTest` y `FitTrainerDatabaseMigrationTest`.

- [ ] **Step 9: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src mobile/app/schemas
git commit -m "feat(mobile): caché offline de la biblioteca de ejercicios en Room (v3) con dueño"
```

---

### Task 5: Mobile — pantalla Biblioteca

**Files:**
- Create: `main/java/com/fittrainer/ui/library/LibraryTexts.kt`
- Create: `main/java/com/fittrainer/ui/library/LibraryUiState.kt`
- Create: `main/java/com/fittrainer/ui/library/LibraryViewModel.kt`
- Create: `main/java/com/fittrainer/ui/library/LibraryScreen.kt`
- Create: `main/java/com/fittrainer/ui/library/components/MuscleChips.kt`
- Modify: `main/java/com/fittrainer/navigation/RoleTabs.kt`, `navigation/RoleShell.kt`
- Create: `test/java/com/fittrainer/ui/library/LibraryUiStateTest.kt`
- Create: `test/java/com/fittrainer/ui/library/LibraryViewModelTest.kt`

**Interfaces:**
- Consumes: `LibraryRepository.observeCache/refresh`, `LibraryExercise`, `LibraryCache` (Task 4); `ExerciseRow`, `ExerciseDetailSheet`, `ExerciseDetail`, `MUSCLE_ORDER`, `muscleLabel`, `InfoCard`, `NoticeBanner`, `OfflineIndicator` (Task 2); `ConnectivityObserver`, `SessionRepository`.
- Produces:
  - `fun availableGroups(exercises: List<LibraryExercise>): List<String>`
  - `fun libraryUiState(cache: LibraryCache?, requestedGroup: String?, isOnline: Boolean, isRefreshing: Boolean, notice: String?): LibraryUiState`
  - `const val STUDENT_LIBRARY_ROUTE = "student/routines"`

- [ ] **Step 1: Tests que fallan del estado**

`test/java/com/fittrainer/ui/library/LibraryUiStateTest.kt`:

```kotlin
package com.fittrainer.ui.library

import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.library.LibraryExercise
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LibraryUiStateTest {

    private fun ex(id: String, muscle: String?) = LibraryExercise(id, "Ej $id", muscle, null, null, null)
    private fun cache(vararg e: LibraryExercise) = LibraryCache(e.toList(), Instant.EPOCH)

    @Test fun `solo hay chips de los grupos con ejercicios, en el orden del backend`() {
        assertEquals(listOf("chest", "legs"), availableGroups(listOf(ex("1", "legs"), ex("2", "chest"), ex("3", "legs"))))
    }

    // Review Focus 2: un grupo que el backend no tiene en su lista no rompe el filtro.
    @Test fun `grupos desconocidos van al final ordenados`() {
        assertEquals(
            listOf("back", "aductores", "zancadas"),
            availableGroups(listOf(ex("1", "zancadas"), ex("2", "back"), ex("3", "aductores"), ex("4", null))),
        )
    }

    @Test fun `filtra por el grupo elegido`() {
        val state = libraryUiState(cache(ex("1", "chest"), ex("2", "legs")), "legs", true, false, null)
        assertEquals("legs", state.selectedGroup)
        assertEquals(listOf("2"), state.exercises.map { it.id })
    }

    // Review Focus 4: el grupo elegido ya no existe después de un refresh → vuelve a "Todos".
    @Test fun `si el grupo elegido desaparece vuelve a Todos`() {
        val state = libraryUiState(cache(ex("1", "chest")), "legs", true, false, null)
        assertNull(state.selectedGroup)
        assertEquals(listOf("1"), state.exercises.map { it.id })
    }

    @Test fun `antes de leer Room no esta cargado`() {
        assertFalse(libraryUiState(null, null, true, false, null).loaded)
    }

    @Test fun `nunca sincronizo y biblioteca vacia son estados distintos`() {
        val never = libraryUiState(LibraryCache(emptyList(), null), null, false, false, null)
        assertFalse(never.everSynced)
        assertTrue(never.isOffline)

        val empty = libraryUiState(cache(), null, true, false, null)
        assertTrue(empty.everSynced)
        assertTrue(empty.isEmpty)
    }

    @Test fun `subtitulo con grupo y equipo sin separadores colgando`() {
        assertEquals("Pecho · Barra", librarySubtitle(LibraryExercise("1", "P", "chest", "Barra", null, null)))
        assertEquals("Barra", librarySubtitle(LibraryExercise("1", "P", null, "Barra", null, null)))
        assertEquals("", librarySubtitle(LibraryExercise("1", "P", null, null, null, null)))
    }

    @Test fun `el detalle de la biblioteca lleva descripcion y no prescripcion`() {
        val detail = LibraryExercise("1", "Press", "chest", "Barra", "Bajá controlado", "https://v").toDetail()
        assertEquals("Bajá controlado", detail.description)
        assertEquals("https://v", detail.videoUrl)
        assertNull(detail.sets)
        assertNull(detail.notes)
    }
}
```

- [ ] **Step 2: Verlos fallar**

Run: `./gradlew testDebugUnitTest --tests "*LibraryUiStateTest"`
Expected: FAIL de compilación.

- [ ] **Step 3: Textos y estado**

`main/java/com/fittrainer/ui/library/LibraryTexts.kt`:

```kotlin
package com.fittrainer.ui.library

import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.components.exercise.ExerciseDetail
import com.fittrainer.ui.components.exercise.muscleLabel

const val LIBRARY_TITLE = "Biblioteca"
const val ALL_GROUPS = "Todos"
const val LIBRARY_REFRESH_FAILED = "No pudimos actualizar. Mostrando la última biblioteca"
const val LIBRARY_OFFLINE = "Sin conexión — mostrando la última biblioteca"

/** "Pecho · Barra", sin separadores colgando si falta algo. */
fun librarySubtitle(exercise: LibraryExercise): String =
    listOf(muscleLabel(exercise.muscleGroup), exercise.equipment.orEmpty())
        .filter { it.isNotBlank() }
        .joinToString(" · ")

fun LibraryExercise.toDetail() = ExerciseDetail(
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
    videoUrl = videoUrl,
    description = description,
)
```

`main/java/com/fittrainer/ui/library/LibraryUiState.kt`:

```kotlin
package com.fittrainer.ui.library

import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.components.exercise.MUSCLE_ORDER

/**
 * loaded == false: todavía no se leyó Room. selectedGroup == null: "Todos".
 * exercises: ya filtrados por el grupo elegido.
 */
data class LibraryUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val groups: List<String> = emptyList(),
    val selectedGroup: String? = null,
    val exercises: List<LibraryExercise> = emptyList(),
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val notice: String? = null,
) {
    /** Sincronizó y la biblioteca no tiene nada (con un grupo elegido nunca pasa: solo hay chips de grupos con ejercicios). */
    val isEmpty: Boolean get() = everSynced && groups.isEmpty() && exercises.isEmpty()
}

/** Los grupos con al menos un ejercicio: primero los del backend en su orden, después los desconocidos. */
fun availableGroups(exercises: List<LibraryExercise>): List<String> {
    val present = exercises.mapNotNull { it.muscleGroup }.toSet()
    return MUSCLE_ORDER.filter { it in present } + (present - MUSCLE_ORDER.toSet()).sorted()
}

/** cache == null: Room todavía no respondió. */
fun libraryUiState(
    cache: LibraryCache?,
    requestedGroup: String?,
    isOnline: Boolean,
    isRefreshing: Boolean,
    notice: String?,
): LibraryUiState {
    if (cache == null) return LibraryUiState(isOffline = !isOnline, isRefreshing = isRefreshing, notice = notice)
    val groups = availableGroups(cache.exercises)
    val group = requestedGroup?.takeIf { it in groups }
    return LibraryUiState(
        loaded = true,
        everSynced = cache.lastSyncedAt != null,
        groups = groups,
        selectedGroup = group,
        exercises = if (group == null) cache.exercises else cache.exercises.filter { it.muscleGroup == group },
        isOffline = !isOnline,
        isRefreshing = isRefreshing,
        notice = notice,
    )
}
```

Run: `./gradlew testDebugUnitTest --tests "*LibraryUiStateTest"`
Expected: PASS.

- [ ] **Step 4: Tests que fallan del ViewModel**

`test/java/com/fittrainer/ui/library/LibraryViewModelTest.kt`:

```kotlin
package com.fittrainer.ui.library

import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.library.libraryDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LibraryViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val api = FakeExerciseApi(LibraryResponse(listOf(libraryDto("ex-1", "chest"), libraryDto("ex-2", "legs"))))
    private val connectivity = FakeConnectivityObserver()
    private val repo = LibraryRepository(api, FakeLibraryDao(), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC))
    private val vm = LibraryViewModel(repo, FakeStudentSession(), connectivity)

    @Test fun `al entrar refresca y muestra la biblioteca con sus chips`() = runTest {
        backgroundScope.launch { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertEquals(listOf("ex-1", "ex-2"), state.exercises.map { it.id })
        assertEquals(listOf("chest", "legs"), state.groups)
    }

    @Test fun `elegir un grupo filtra y Todos lo saca`() = runTest {
        backgroundScope.launch { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()

        vm.onSelectGroup("legs")
        advanceUntilIdle()
        assertEquals(listOf("ex-2"), vm.uiState.value.exercises.map { it.id })

        vm.onSelectGroup(null)
        advanceUntilIdle()
        assertEquals(2, vm.uiState.value.exercises.size)
    }

    @Test fun `el pull que falla avisa y conserva lo guardado`() = runTest {
        backgroundScope.launch { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        api.error = IOException("sin red")

        vm.onPullToRefresh()
        advanceUntilIdle()

        assertEquals(LIBRARY_REFRESH_FAILED, vm.uiState.value.notice)
        assertEquals(2, vm.uiState.value.exercises.size)
    }

    @Test fun `el refresh automatico que falla no avisa`() = runTest {
        backgroundScope.launch { vm.uiState.collect {} }
        api.error = IOException("sin red")
        connectivity.state.value = false

        vm.onStart()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertNull(state.notice)
        assertTrue(state.isOffline)
        assertTrue(!state.everSynced)
    }

    @Test fun `nunca dos pedidos a la red a la vez`() = runTest {
        backgroundScope.launch { vm.uiState.collect {} }
        api.gate = CompletableDeferred()

        vm.onStart()
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertEquals(1, api.calls)

        api.gate?.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, api.calls)
    }
}
```

Run: `./gradlew testDebugUnitTest --tests "*LibraryViewModelTest"`
Expected: FAIL de compilación (`LibraryViewModel` no existe).

- [ ] **Step 5: ViewModel**

`main/java/com/fittrainer/ui/library/LibraryViewModel.kt`:

```kotlin
package com.fittrainer.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.library.LibraryCache
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Biblioteca. Lee siempre de Room (vía el repositorio) y refresca al quedar visible y con
 * pull-to-refresh, nunca dos pedidos a la vez. El filtro por grupo es en memoria: anda offline.
 */
@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val repository: LibraryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val student: StateFlow<AuthUser?> = sessionRepository.session
        .map { (it as? Session.Student)?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val selectedGroup = MutableStateFlow<String?>(null)
    private val refreshState = MutableStateFlow(RefreshState())
    private var refreshJob: Job? = null
    private var manualRequested = false

    // null hasta que Room responde la primera vez.
    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache: Flow<LibraryCache?> = student.filterNotNull()
        .flatMapLatest { repository.observeCache(it.id) }
        .map<LibraryCache, LibraryCache?> { it }
        .onStart { emit(null) }

    val uiState: StateFlow<LibraryUiState> =
        combine(cache, selectedGroup, connectivity.isOnline, refreshState) { c, group, online, r ->
            libraryUiState(c, group, online, r.isRefreshing, r.notice)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), LibraryUiState())

    /** La pantalla quedó visible (al entrar a la pestaña o al volver la app al frente). */
    fun onStart() = refresh(manual = false)

    fun onPullToRefresh() = refresh(manual = true)

    /** null = "Todos". */
    fun onSelectGroup(group: String?) {
        selectedGroup.value = group
    }

    fun dismissNotice() = refreshState.update { it.copy(notice = null) }

    /** Si ya hay un pedido en vuelo, un pull solo lo marca como manual (para que avise si falla). */
    private fun refresh(manual: Boolean) {
        if (refreshJob?.isActive == true) {
            if (manual) manualRequested = true
            return
        }
        manualRequested = manual
        refreshJob = viewModelScope.launch {
            val user = student.filterNotNull().first()
            refreshState.value = RefreshState(isRefreshing = true)
            val result = repository.refresh(user.id)
            // Solo el refresco manual avisa si falla; el automático muestra lo que hay sin alarmar.
            refreshState.value = RefreshState(notice = if (manualRequested && result.isFailure) LIBRARY_REFRESH_FAILED else null)
        }
    }

    private data class RefreshState(val isRefreshing: Boolean = false, val notice: String? = null)
}
```

Run: `./gradlew testDebugUnitTest --tests "*LibraryViewModelTest" --tests "*LibraryUiStateTest"`
Expected: PASS.

- [ ] **Step 6: Chips y pantalla**

`main/java/com/fittrainer/ui/library/components/MuscleChips.kt`:

```kotlin
package com.fittrainer.ui.library.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.library.ALL_GROUPS
import com.fittrainer.ui.theme.Spacing

/** "Todos" + un chip por grupo con ejercicios. selected == null: "Todos". */
@Composable
fun MuscleChips(groups: List<String>, selected: String?, onSelect: (String?) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        item {
            FilterChip(
                selected = selected == null,
                onClick = { onSelect(null) },
                label = { Text(ALL_GROUPS) },
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
            )
        }
        items(groups, key = { it }) { group ->
            FilterChip(
                selected = selected == group,
                onClick = { onSelect(group) },
                label = { Text(muscleLabel(group)) },
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
            )
        }
    }
}
```

`main/java/com/fittrainer/ui/library/LibraryScreen.kt`:

```kotlin
package com.fittrainer.ui.library

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.ExerciseDetailSheet
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.library.components.MuscleChips
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Biblioteca de ejercicios del alumno (sin mockup: componentes y tema de la Rutina del día). */
@Composable
fun LibraryScreen(viewModel: LibraryViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    LibraryBody(state, viewModel::onPullToRefresh, viewModel::onSelectGroup, viewModel::dismissNotice)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryBody(
    state: LibraryUiState,
    onRefresh: () -> Unit,
    onSelectGroup: (String?) -> Unit,
    onDismissNotice: () -> Unit,
) {
    var selected by remember { mutableStateOf<LibraryExercise?>(null) }
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
            item {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text(LIBRARY_TITLE, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
                    if (state.isOffline) OfflineIndicator(if (state.everSynced) LIBRARY_OFFLINE else "Sin conexión")
                }
            }
            state.notice?.let { notice -> item { NoticeBanner(notice, onDismissNotice) } }
            when {
                !state.loaded -> Unit
                !state.everSynced -> item {
                    InfoCard("Todavía no hay datos", "Conectate una vez para bajar la biblioteca.")
                }
                state.isEmpty -> item {
                    InfoCard("Biblioteca vacía", "Tu entrenador todavía no cargó ejercicios.")
                }
                else -> {
                    item { MuscleChips(state.groups, state.selectedGroup, onSelectGroup) }
                    items(state.exercises, key = { it.id }) { exercise ->
                        ExerciseRow(exercise.name, librarySubtitle(exercise), onClick = { selected = exercise })
                    }
                }
            }
        }
    }
    selected?.let { exercise ->
        ExerciseDetailSheet(exercise.toDetail(), canOpenVideo = !state.isOffline, onDismiss = { selected = null })
    }
}
```

- [ ] **Step 7: Navegación**

En `navigation/RoleTabs.kt`: `const val STUDENT_LIBRARY_ROUTE = "student/routines"` debajo de `STUDENT_TODAY_ROUTE`, y la pestaña pasa a `Tab(STUDENT_LIBRARY_ROUTE, "Mis rutinas", Icons.AutoMirrored.Filled.List)`.

En `navigation/RoleShell.kt`: sumar `tab.route == STUDENT_LIBRARY_ROUTE -> LibraryScreen()` debajo del caso de `STUDENT_TODAY_ROUTE`, con `import com.fittrainer.ui.library.LibraryScreen`.

- [ ] **Step 8: Compilar y tests**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL, todos los tests en verde, ningún archivo de más de 200 líneas.

- [ ] **Step 9: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src
git commit -m "feat(mobile): pantalla Biblioteca de ejercicios con filtro por grupo muscular offline"
```

---

### Task 6: Verificación final y E2E en emulador

**Files:** ninguno (solo verificación). Si algo falla, se arregla en la tarea dueña del código y se vuelve a correr todo.

- [ ] **Step 1: Backend**

Run (worktree): `npm run lint && npm test`
Expected: verde.

- [ ] **Step 2: Mobile**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest` y, con el emulador prendido, `./gradlew connectedDebugAndroidTest`
Expected: verde.

- [ ] **Step 3: E2E** (backend del worktree con `npm run dev`; app en el emulador apuntando a `http://10.0.2.2:3001/api`)

1. Con el token de `profe.card8@test.com` crear un ejercicio propio con descripción y video:
   ```bash
   curl -s -X POST http://localhost:3001/api/exercises -H "Authorization: Bearer $PROFE" -H "Content-Type: application/json" \
     -d '{"name":"Press inclinado card9","muscle_group":"chest","equipment":"Mancuernas","description":"Banco a 30°, bajá controlado.","video_url":"https://www.youtube.com/watch?v=8iPEnn-ltC8"}'
   ```
2. Entrar con `alumna.card8@test.com` / `Prueba1234` → pestaña "Mis rutinas": se ven los globales más "Press inclinado card9".
3. Tocar el chip "Pecho": solo quedan los de pecho. "Todos" los vuelve a mostrar.
4. Abrir "Press inclinado card9": se ve "DESCRIPCIÓN" con el texto, y "Ver video" abre YouTube o el navegador.
5. Activar el modo avión y volver a la pestaña: la lista y el filtro siguen andando, arriba dice "Sin conexión — mostrando la última biblioteca" y el detalle muestra "El video necesita conexión". Un pull-to-refresh muestra "No pudimos actualizar. Mostrando la última biblioteca".
6. Sacar el modo avión, cerrar sesión y entrar con otro alumno de prueba (ver `usuarios-prueba-e2e`) en modo avión: la biblioteca dice "Todavía no hay datos" (no se ve la de la alumna anterior).
7. Pestaña "Hoy" de la alumna: sigue igual que en la tarjeta 8 (filas, detalle con series/reps/nota y "Ver video").

- [ ] **Step 4: Borrar el ejercicio de prueba**

```bash
curl -s -X DELETE http://localhost:3001/api/exercises/<id del paso 1> -H "Authorization: Bearer $PROFE" -o /dev/null -w "%{http_code}\n"
```

Expected: `204`.
