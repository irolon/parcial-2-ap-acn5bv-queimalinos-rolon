---
tags: [plan]
tarjeta: E4
---
# E4 · Historial del alumno y comentario del entrenador — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** el entrenador ve las sesiones de un alumno (lista y detalle, con el descanso real) y deja o borra su comentario, que el alumno ve en su historial.

**Architecture:** `StudentSessionsRepository` cachea en Room (v14) la lista de cada alumno (página 1 y "Ver más") y los detalles abiertos, en `trainer_sessions` (detalle como JSON) y `trainer_sessions_sync` (paginación). Así quedó al implementar: ver spec §4, que manda sobre las Tasks de abajo. Reusa los DTOs, mappers y componentes visuales del historial del alumno sin tocar `HistoryRepository`. El comentario es un `PATCH` online que actualiza el caché con la respuesta.

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e4-historial-comentario-design.md`

## Global Constraints

- ≤ 200 líneas; capa → módulo → archivo (`data/students/sessions/`, `ui/students/sessions/`).
- No cambiar el comportamiento del historial del alumno (sus tests tienen que seguir verdes sin tocarlos).
- Room v14 (`AutoMigration(13, 14)`, `MigrationV14Test`).
- Comentario: hasta 1000 caracteres; `""` borra; solo online.
- PR: "feat(mobile): historial del alumno y comentario del entrenador (tarjeta E4)", base `feature/android-entrenador-ficha`.

## Review Focus

1. Dos alumnos con sesiones: refrescar uno no borra la página 1 cacheada del otro → test en Task 2.
2. Guardar el comentario mientras se refresca el detalle → gana la respuesta del PATCH, no se pisa con la lectura vieja → test en Task 2 (orden de escrituras).
3. "Ver más" sin red → aviso, sin vaciar la lista → test en Task 3.
4. Comentario de solo espacios → el backend lo guarda como null; la UI lo muestra como "sin comentario" → test en Task 3.
5. Una sesión del alumno con un ejercicio sustituido → se ve "en lugar de …" como en el historial del alumno → test del mapper en Task 1.

---

### Task 1: API y mappers

**Files:**
- Modify: `data/api/SessionApi.kt` (`@PATCH("sessions/{id}/comment") suspend fun comment(@Path("id") id: String, @Body body: TrainerCommentRequest): HistorySummaryResponse`, con el DTO que devuelve el resumen)
- Create: `data/students/sessions/TrainerSessionMapper.kt`: DTO → entidades `trainer_*` → los mismos modelos `HistoryItem` / `HistoryDetail` (origin `SERVER`, `commentUnread = false`)
- Test: `TrainerSessionMapperTest.kt`

- [ ] **Tests:**
  - el resumen y el detalle se convierten igual que en `HistoryMapper`, con el descanso y el plan;
  - la sustitución trae su nombre original.
- [ ] Implementar → verde.

### Task 2: Room v14 y `StudentSessionsRepository`

> **Cómo quedó (01/11):** dos tablas, no tres. `trainer_sessions` (PK trainerId, id) tiene `listed` y `exercisesJson`; `trainer_sessions_sync` (PK trainerId, studentId) tiene `fetchedAt`, `nextPage` y `hasMore`. `loadMore(trainerId, studentId)` guarda la página en Room (`appendPage`), no la devuelve. Hay un Mutex por (entrenador, alumno) para lista, "Ver más", detalle y comentario. El detalle de abajo es el plan original.

**Files:**
- Create: `data/db/students/sessions/TrainerSessionEntities.kt` (`trainer_sessions` con PK `(trainerId, id)` y columnas `studentId, inLatest, detailLoaded` más las del resumen; `trainer_session_exercises`; `trainer_session_sets`), `TrainerSessionsDao.kt`
- Create: `data/students/sessions/StudentSessionsRepository.kt`
- Modify: `FitTrainerDatabase.kt` (v14), `di/StudentsModule.kt`
- Test: `StudentSessionsRepositoryTest.kt`, fake del DAO, `MigrationV14Test.kt`

**Interfaces:**
- Produces:
  - `observeLatest(trainerId, studentId): Flow<SessionsCache>` (`items: List<HistoryItem>`, `fetchedAt`, `hasMore`);
  - `refreshLatest(trainerId, studentId): Result<Unit>`;
  - `loadMore(trainerId, studentId, page): Result<List<HistoryItem>>`;
  - `observeDetail(trainerId, sessionId): Flow<HistoryDetail?>`;
  - `refreshDetail(trainerId, studentId, sessionId): Result<Unit>`;
  - `saveComment(trainerId, studentId, sessionId, text): Result<Unit>`;
  - `clearUserData`.
- [ ] **Tests:**
  - refresh de A no toca a B;
  - detalle guardado;
  - el comentario actualiza el resumen y el detalle;
  - `""` → null en el caché;
  - error conserva;
  - otro dueño no ve nada;
  - el refresh del detalle y `saveComment` se serializan con un `Mutex` por sesión, y gana el último en terminar con datos del servidor (el PATCH devuelve el estado actual).
- [ ] Implementar → verde; migración en el emulador.

### Task 3: UI — sección en la ficha, lista y detalle con comentario

**Files:**
- Create:
  - `ui/students/sessions/StudentSessionsScreen.kt` + ViewModel + UiState;
  - `ui/students/sessions/detail/StudentSessionDetailScreen.kt` + ViewModel;
  - `components/TrainerCommentEditor.kt`;
  - `ui/students/detail/components/LatestSessionsSection.kt`.
- Modify: `StudentDetailScreen.kt` (sección "ÚLTIMAS SESIONES" con 3 y "Ver todas"), `RoleTabs.kt`/`RoleShell.kt` (rutas `trainer/students/{studentId}/sessions` y `.../sessions/{sessionId}`)
- Reusar sin copiar: `HistoryCard`, `ExerciseBlock`, `DetailHeader` y los textos de `HistoryTexts.kt`. Si alguno depende de algo solo del alumno (`SyncMark`, no leídos), pasarle un parámetro con default para que el alumno no cambie.
- Test: ViewModels (lista: "Ver más" sin red; detalle: contador, más de 1000 bloqueado, guardar, borrar, sin red), textos.
- [ ] Tests que fallan → implementar → verde. `gradlew checkFileLength assembleDebug testDebugUnitTest`.

### Task 4: E2E, auditoría y PR

- [ ] **E2E:**
  - como `profe.card8`, ficha de alumna.card8 → "ÚLTIMAS SESIONES";
  - sesión del 01/11 → ver "desc. 0:19 (plan 0:30)" en ámbar;
  - comentar "Buen ritmo, cuidá el descanso" → guardado;
  - modo avión → la lista y el detalle se ven y "Guardar" está deshabilitado;
  - cerrar sesión, entrar como alumna.card8 → Progreso → la sesión tiene el comentario (💬).
- [ ] Verificación completa; auditoría.
- [ ] Con el ✅: commit, push y PR con base `feature/android-entrenador-ficha`; tarjeta a ⏳ PENDIENTES.
