---
tags: [spec]
tarjeta: 9
---
# Spec — Biblioteca de ejercicios en mobile

- **Tarjeta:** "9 · Biblioteca de ejercicios en mobile" (tablero personal de Igna) → tarjeta de equipo https://trello.com/c/N3ibzf1E
- **Fecha:** 2026-10-17
- **Ramas:**
  - backend: `feature/exercises-library`, sale de `feature/students-body-metrics` (tiene el repositorio de Students y el `backend/README.md` nuevo), en un worktree aparte como la tarjeta 8; PR chico y separado;
  - mobile: `feature/android-biblioteca`, sale de `feature/android-rutina-del-dia` (reutiliza sus componentes y su base Room v2).
- **Reglas que aplican:** `AGENTS.md` (Mobile: Room es la única fuente de verdad) y `CONTRIBUTING.md` (200 líneas, capa → módulo → archivo).
- **Diseño:** sin mockup propio. Aparece en el mapa del sitio (Guía Mobile p.5) dentro de "Mis rutinas". Se arma con los componentes y el tema de la Rutina del día.

**Pendiente:** el checklist "Puntos a desarrollar" de la tarjeta de equipo no se pudo leer desde los MCP de Trello. Este spec sale de la descripción de la tarjeta y del debate del 17/10.

## 1. Objetivo

Que el alumno explore la biblioteca de ejercicios desde el celular y vea los videos de técnica cuando quiera, no solo durante la sesión. La lista funciona offline; el video, no.

**Criterio de aceptación (de la tarjeta):** el alumno entra a la biblioteca, filtra por grupo muscular, abre un ejercicio y ve la descripción y el video.

## 2. Decisiones tomadas

- **Biblioteca completa (opción B del debate):** el alumno ve los ejercicios globales más los propios de su entrenador, no solo los de sus rutinas. Costo estimado 14–16 h contra las 8 h de la tarjeta; Igna lo eligió con el déficit a la vista.
- **Endpoint nuevo solo para alumno, `GET /exercises/library`.** `GET /exercises` queda igual (solo trainer, con sus filtros): la web de Pablo no cambia.
- **Sin filtros en el servidor.** La app baja la biblioteca entera y filtra por grupo muscular en memoria: el filtro funciona offline.
- **Video como link externo**, igual que en Hoy: botón "Ver video" que abre YouTube o el navegador. Sin reproductor embebido (ahorra una dependencia y 3–4 h). Sin red, en lugar del botón se muestra "El video necesita conexión".
- **Dónde vive:** la pestaña "Mis rutinas" (`student/routines`, hoy placeholder) abre la biblioteca. Cuando exista la pantalla real de "Mis rutinas", la biblioteca pasa a ser una entrada dentro de ella. *(Nota 01/11: ya existe. La pestaña Mis rutinas tiene pantalla propia y la biblioteca es una entrada dentro de ella, en `student/library`; ver el [[superpowers/specs/2026-10-31-mis-rutinas-design|spec de Mis rutinas]].)*
- **Refresh sin WorkManager:** al entrar a la pantalla y con pull-to-refresh. Mismo patrón que `RoutineRepository`.
- **Room pasa a versión 3 con `AutoMigration(2→3)`**, que solo agrega tablas, y su caso en `FitTrainerDatabaseMigrationTest`. Nunca migraciones destructivas.
- **Al cerrar sesión se borran los dos cachés** (rutinas y biblioteca). Para eso `UserDataCleaner` pasa de binding único a multibinding (`@IntoSet`).

## 3. Backend: `GET /api/exercises/library`

| | |
|---|---|
|Rol|`student` (`authenticate, requireRole('student')`; se declara **antes** del `router.use(authenticate, requireRole('trainer'))` del módulo)|
|Query / body|ninguno|
|Respuesta 200|`{ data: [ { id, name, muscle_group, equipment, description, video_url } ] }`, ordenado por `name`; `[]` si no hay ejercicios|
|Errores|401 sin token; 403 si no es alumno; 404 si el alumno del token no existe|

- **Capas:** ruta → `exercisesController.library` → `exercisesService.library(studentId)` → `studentsRepository.findStudentById(studentId)` para leer su `trainer_id` → `exercisesRepository.findLibrary(trainerId)`, que selecciona solo las columnas públicas (`LIBRARY_COLUMNS` en el modelo).
- **Ownership:** el `trainerId` sale de la fila del alumno en la base, nunca del request. Filtro: `is_global = true` OR `trainer_id = <su entrenador>`. Un alumno no puede ver los ejercicios privados de otro entrenador.
- **Alumno sin entrenador** (`trainer_id` null): devuelve solo los globales (la query no lleva el OR).
- **Columnas:** `trainer_id` e `is_global` no salen en la respuesta: al alumno no le sirven.
- **Tests** (árbol espejado en `tests/unit/...`): el service con el alumno que tiene trainer, sin trainer y el que no existe. El backend no tiene tests de rutas ni de repositories (no hay supertest ni mock de Supabase): el 403 a un trainer y el filtro del repo se prueban con curl.
- **README:** se suma a la tabla de Endpoints de `backend/README.md` y a "Desvíos respecto del contrato de API (Notion v1.1)". Para la web: nada que hacer, es solo de mobile.

## 4. Mobile: datos

| Archivo | Qué hace |
|---|---|
|`data/api/ExerciseApi.kt`|`@GET("exercises/library")` → `LibraryResponse(data: List<LibraryExerciseDto>)`|
|`data/db/library/LibraryEntities.kt`|`LibraryExerciseEntity` (id, name, muscleGroup, equipment, description, videoUrl) y `LibrarySyncEntity` (id = 0, ownerId, lastSyncedAt)|
|`data/db/library/LibraryDao.kt`|copia el contrato de `RoutineDao`: `observeExercises`, `observeSync`, `replaceAll` atómico, `snapshot(ownerId)` transaccional, `clear`, `clearIfOwner`|
|`data/library/LibraryExercise.kt`|modelo de dominio y `LibraryCache(exercises, lastSyncedAt)`|
|`data/library/LibraryMapper.kt`|DTO → entidad → dominio|
|`data/library/LibraryRepository.kt`|`observeCache(ownerId)` y `refresh(ownerId): Result<Unit>`; implementa `UserDataCleaner`|

- **Caché con dueño**, igual que el de rutinas: lo guardado para otro alumno se ve como "nunca sincronizó"; si `refresh` falla, Room queda como estaba y el error viaja en un `DataException`.
- **`FitTrainerDatabase`:** suma las dos entidades y `libraryDao()`, `version = 3` y `AutoMigration(from = 2, to = 3)`; se exporta `schemas/.../3.json`.
- **Logout:** `RoutineModule` deja el `@Binds` único; cada repositorio se registra con `@Binds @IntoSet` (en un `di/` por módulo) y `TokenSessionRepository` recibe `Set<@JvmSuppressWildcards UserDataCleaner>` y llama a todos. Un cleaner que falla no impide que corran los demás, y el logout sigue terminando.

## 5. Mobile: UI (`ui/library/`)

- **`LibraryScreen` / `LibraryViewModel` / `LibraryUiState`.** El `NavHost` del alumno manda `student/routines` a `LibraryScreen` en lugar del placeholder. El título de la pantalla es "Biblioteca".
- **Filtro:** una fila con scroll horizontal de chips (`FilterChip`, toque mínimo 44 px): "Todos" más **solo los grupos que tienen al menos un ejercicio**, en el orden de `MUSCLE_GROUPS` del backend y con los textos de `muscleLabel`. Si el grupo elegido deja de existir tras un refresh, vuelve a "Todos".
- **Componentes compartidos:** `ExerciseRow` y `ExerciseDetailSheet` se mudan de `ui/today/components/` a `ui/components/exercise/`, porque ahora los usan dos features. `ExerciseRow` pasa a recibir `(title, subtitle, onClick)` en vez de un `RoutineExercise`: Hoy le pasa su `exerciseSubtitle` (series × reps…) y la biblioteca, grupo · equipo. `muscleLabel` y `formatKg` salen de `ui/today/RoutineTexts.kt` hacia `ui/components/exercise/ExerciseTexts.kt`, y sus tests se mudan con ellos.
- **Lista:** una `ExerciseRow` por ejercicio, ordenada por nombre. Un toque abre la hoja de detalle.
- **Estados:**
  - cargando la primera vez;
  - nunca sincronizó y sin red: "Conectate una vez para bajar la biblioteca";
  - biblioteca vacía: "Tu entrenador todavía no cargó ejercicios";
  - el refresh falló pero hay datos: se muestran igual, con un aviso;
  - pull-to-refresh.
- **Detalle:** `ExerciseDetailSheet` pasa a recibir un modelo de detalle con campos opcionales (`ExerciseDetail`: nombre, grupo, equipo, descripción, video, y series/reps/peso/tempo/descanso/nota solo cuando viene de Hoy). Hoy y la biblioteca lo construyen desde su modelo con un mapper. La descripción se muestra en un bloque "DESCRIPCIÓN". Video: con red, botón "Ver video"; sin red, el texto "El video necesita conexión"; sin `video_url`, nada. El archivo sigue debajo de las 200 líneas.
- **Conexión:** se usa el `ConnectivityObserver` que ya existe.

## 6. Pruebas

- **Backend:** `npm run lint` (incluye las 200 líneas) y `npm test` en `backend/`.
- **Unit mobile** (`testDebugUnitTest`): `LibraryMapperTest`; `LibraryRepositoryTest` (dueño, falla que conserva el caché, `clearUserData`); `LibraryViewModelTest` (chips solo de grupos con ejercicios, filtro, vuelta a "Todos", estados); `TokenSessionRepositoryTest` con dos cleaners (los dos se limpian, aunque uno falle); el mapper de `ExerciseDetail` desde Hoy y desde la biblioteca. Los fakes van en `testing/fakes/library/`.
- **Instrumentados:** `LibraryDaoTest` (reemplazo atómico, snapshot por dueño, `clearIfOwner`) y el caso 2→3 en `FitTrainerDatabaseMigrationTest`.
- **Build:** `gradlew checkFileLength assembleDebug testDebugUnitTest`.
- **E2E en emulador** con `alumna.card8@test.com` / `Prueba1234`:
  1. con el entrenador `profe.card8` se crea un ejercicio propio con descripción y video (`POST /api/exercises`);
  2. la alumna entra a "Mis rutinas" y ve globales + el propio;
  3. filtra por un grupo y solo quedan los de ese grupo;
  4. abre el ejercicio: ve la descripción y "Ver video" abre el link;
  5. en modo avión: la lista y el filtro siguen andando; el detalle muestra "El video necesita conexión";
  6. cierra sesión, entra con otro alumno: no ve la biblioteca anterior.

## 7. Fuera de alcance

- Reproductor embebido y videos offline.
- Búsqueda por nombre y filtro por equipo (se pueden sumar en memoria más adelante si sobra tiempo).
- Que el alumno cree o edite ejercicios.
- La pantalla real de "Mis rutinas" (lista de rutinas del alumno).
