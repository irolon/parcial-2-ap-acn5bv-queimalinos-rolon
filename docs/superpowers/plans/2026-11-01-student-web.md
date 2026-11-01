# Paridad del alumno en la web (tarjeta 50) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el alumno use la web: Hoy con la rutina del día, una sesión activa simplificada que sube igual que el celular, Mis rutinas, Historial, Mi progreso con racha y logros, y Mi perfil con medidas.

**Architecture:** Solo frontend. La sesión en curso se guarda en `localStorage` por alumno y se sube entera al terminar, con ids del cliente (idempotente), igual que `SessionUploader.kt`. La lógica de la sesión y de la subida son funciones puras en `utils/workout/`, y la UI las usa con un hook. Se reutilizan los componentes del PT con un modo alumno.

**Tech Stack:** React 19, React Router 7, TanStack Query 5, Tailwind 4 y Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-student-web-design.md`

## Global Constraints

- **Alcance:** solo `frontend/` y `docs/`. El backend no cambia y no se suman dependencias.
- **CONTRIBUTING:**
  - archivos ≤ 200 líneas;
  - carpetas ≤ 10 archivos (si se pasa, subdividir por tema);
  - capa → módulo → archivo;
  - tests espejo en `frontend/tests/`, y un test dividido va en una carpeta con el nombre de la unidad;
  - docs en la misma PR.
- **Comandos:** en `frontend/`, `npm test` y `npm run lint`. La suite completa tarda unos 200 s: correrla en background.
- **Commits:** en español (`feat(student-web): …`), **sin** trailers de IA.
- **Textos:** los literales de la spec, en español rioplatense.
- **Fechas:** en `America/Argentina/Buenos_Aires`.
- **Ids:** `crypto.randomUUID()`.
- **`localStorage`:** todo acceso va en `try/catch`. Si falla, la sesión sigue en memoria.
- **Contrato de subida:** el del celular (`mobile/.../SessionUploader.kt` y `contratos-api.md` §Sesiones). Lotes de 100 series. Los `failed` son permanentes. Red o 5xx se reintentan.

## Review Focus

1. Subida cortada a la mitad (por ejemplo, después del `POST /sessions` o del primer lote): el reintento no duplica la sesión ni las series y termina.
2. Recargar la página en medio de la sesión: las series, el ejercicio a la vista y el descanso (`restEndsAt` absoluto) siguen igual.
3. Día de descanso contra alumno sin rutina asignada: los dos mensajes distintos de la spec.
4. Tocar Empezar en otra rutina con una sesión en curso no pisa la abierta: ofrece continuar o descartar.
5. El alumno no ve acciones del PT (comentar, borrar medidas cargadas por el PT, editar el perfil): ninguna acción da 403.

---

### Task 1: Navegación, API, hooks y utilidades de Hoy

**Files:**
- `routes/routeTable.js`: sacar `asistente` de `STUDENT_NAV`; sumar `WORKOUT_PATH = '/alumno/entrenar'` y `studentRoutineHref(id)`.
- `routes/router.jsx`: elementos del alumno y páginas fuera del menú. Por ahora apuntan a páginas que la Task 3 completa; mientras tanto pueden ser componentes mínimos.
- `api/routines/routines.api.js`: `getTodayRoutine()` y `getMyRoutines()`.
- `api/sessions/sessions.api.js`: `createSession(body)` y `uploadSets(sessionId, sets)`.
- `hooks/routines/` (o `hooks/student/`): `useTodayRoutine()` y `useMyRoutines()`.
- `utils/routines/` (y `greetingDate` en `utils/dates.js`):
  - `estimatedMinutes(exercises)`;
  - `planRows(exercises)`;
  - `weekStrip({ routineDays, sessions, now })` → `[{ weekday 1-7, label 'L', planned, trained, isToday }]`;
  - `nextTrainingDay(routines, now)` → `'jueves' | null`;
  - `greetingDate(now)` → 'Domingo 1 de noviembre'.
- Tests espejo, más ajustes de `routeTable.test`, `guards.test` y `sidebar.test`.

**Interfaces (Produces):** los nombres de arriba. Formas de rutina, tal como las devuelve el backend: `{ routine_id | id, name, days, exercises: [{ routine_exercise_id, exercise: { id, name, … }, sets, reps, rest_seconds, suggested_kg, last_session_kg, tempo, notes }] }`. Verificar contra `backend/src/services/routines` cuál es la forma de `/routines/mine` y normalizarla en la API si difiere de `/today`.

- [ ] Tests primero, con bordes de semana en Argentina (domingo 23:59 contra lunes 00:00) y Review Focus 3 a nivel de utilidad.
- [ ] Implementar. Correr `npm test` y `npm run lint`. Commit.

### Task 2: Motor de la sesión (lógica pura, almacenamiento y subida)

**Files:**
- `utils/workout/`:
  - `workoutState.js`: `startWorkout(routine, { now, newId })`, `registerSet(state, { kg, reps }, now)`, `removeSet(state, setId)`, `setCursor(state, i)`, `startRest`, `adjustRest(state, ±15)`, `skipRest`, `prefill(state)` → `{ kg, reps }`, `missingSets(state)`, `totals(state)` → `{ sets, volumeKg, minutes }`, `setFeedback(state, { rpe, notes })`.
  - `workoutStorage.js`: `loadWorkout(studentId)`, `saveWorkout(studentId, state)` y `clearWorkout(studentId)`, con `try/catch`.
  - `uploadWorkout.js`: `uploadWorkout({ api, state, onState })` → `{ failed, unlocked }`. Reanudable; actualiza `state.upload` y lo persiste en cada paso vía `onState`.
- `hooks/workout/useActiveWorkout(studentId)`: estado y acciones. Persiste en cada cambio.

**Interfaces (Produces):** las de arriba. Los campos del payload, exactos como el celular: revisar `SessionUploader.kt` y `contratos-api.md` (`POST /sessions` y `POST /sessions/:id/sets`).

- [ ] Tests primero:
  - Review Focus 1: el API falso falla después del `POST /sessions` y después del primer lote; el reintento no repite ni la sesión ni las series ya enviadas.
  - Review Focus 2: el estado serializado y vuelto a leer da lo mismo, y el descanso se calcula contra `now`.
  - Precarga de la serie 1 contra la serie 2.
  - `failed` permanentes.
  - `unlocked` sin repetir.
  - Lotes de 100.
- [ ] Implementar. Correr `npm test` y `npm run lint`. Commit.

### Task 3: Hoy y Mis rutinas

**Files:** `pages/student/TodayPage.jsx`, `pages/student/MyRoutinesPage.jsx`, `pages/student/RoutineDetailPage.jsx` y `components/student/` (hero, tabla del plan, semana, tarjeta de rutina, diálogo de descartar).

**Interfaces:** Consumes Tasks 1-2. Empezar crea el estado con `startWorkout` y navega a `WORKOUT_PATH`.

- [ ] Tests primero:
  - Review Focus 3 y 4.
  - Textos y estados de carga y error.
  - Empezar navega.
  - Continuar y Descartar, con confirmación.
- [ ] Implementar. Correr `npm test` y `npm run lint`. Commit.

### Task 4: Sesión activa

**Files:** `pages/student/WorkoutPage.jsx` y `components/workout/` (encabezado con segmentos, panel del ejercicio con los campos de peso y reps, tabla de series, descanso, diálogo de terminar, feedback, subida y resumen).

**Interfaces:** Consumes Task 2. Las etiquetas del RPE se copian de `mobile/app/src/main/java/com/fittrainer/ui/workout/RpeTexts.kt`.

- [ ] Tests primero:
  - Registrar arranca el descanso.
  - +15/−15/Saltar.
  - Borrar una serie pide confirmación.
  - Terminar con faltantes y sin series.
  - Feedback Saltar y Guardar.
  - Subida: error con Reintentar, y resumen con logros y `failed`.
  - Sin sesión en curso, redirige a Hoy.
- [ ] Implementar. Correr `npm test` y `npm run lint`. Commit.

### Task 5: Historial en modo alumno y Mi perfil con medidas

**Files:**
- `components/sessions/` (`viewer` prop en `SessionsHistory`, `SessionDetail` y lo que haga falta).
- `pages/student/HistoryPage.jsx` y `pages/student/MyProfilePage.jsx`.
- `components/body-metrics/MetricsHistory.jsx` (`canDelete(metric)`).
- `hooks/body-metrics/useBodyMetrics.js` (invalidar `['progress','body',id]`).

- [ ] Tests primero:
  - Review Focus 5: sin `SessionComment` para el alumno; ✕ solo en `recorded_by = 'student'`; sin acciones de edición en el perfil.
  - Textos en 2ª persona.
  - Registrar medición refresca medidas y progreso.
  - El PT no cambia, con los tests existentes en verde.
- [ ] Implementar. Correr `npm test` y `npm run lint`. Commit.

### Task 6: Racha y logros en Mi progreso (y la pastilla de Hoy)

**Depende de la #42.** Antes de empezar, `git fetch` y fijarse si `origin/develop` ya tiene `components/achievements/`. Si lo tiene, mergear `origin/develop`. Si no, mergear `origin/feature/web-challenges` y anotarlo en el reporte.

**Files:**
- `components/achievements/`: modo alumno, con textos en 2ª persona y sin acciones del PT.
- Sección nueva en Mi progreso.
- Hook `useAchievementProgressQuery(id)` (`/students/:id/achievements/progress`).
- Pastilla de racha en Hoy, si en la Task 3 quedó con un dato provisorio.

- [ ] Tests primero: bloqueados con "7/10 sesiones", desbloqueados con fecha, racha 0 sin pastilla, desafíos activos y su historial.
- [ ] Implementar. Correr `npm test` y `npm run lint`. Commit.

### Task 7: Documentación de la paridad

Los archivos de la spec §6. Lo que queda solo en el celular y lo pendiente (asistente IA) tiene que quedar explícito y coincidir con la spec §5.

- [ ] Escribir. Commit.
