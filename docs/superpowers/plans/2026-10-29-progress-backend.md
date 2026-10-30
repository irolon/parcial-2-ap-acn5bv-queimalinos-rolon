# Módulo Progress en el backend — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GET /api/progress/exercise/:exerciseId` (curva con 3 métricas agregada en Postgres), `GET /api/progress/body/:studentId` (historial + resumen) y `last_session_kg` real en `/routines/today`.

**Architecture:** dos funciones SQL (`exercise_progress`, `last_session_kg`) y un índice en una migración; módulo `progress` con el layering del backend que las llama con `supabase.rpc`; funciones puras en `models/progress/` para redondeo, PR y resumen; autorización en el service (ADR 0001).

**Tech Stack:** Node (ESM), Express 4, supabase-js (service role), Postgres (Supabase), Jest ESM.

**Spec:** `docs/superpowers/specs/2026-10-29-progress-backend-design.md`

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código > 200 líneas (tests y `.sql` incluidos); ≤ 10 archivos por carpeta; capa → módulo (`progress`) → archivo; tests espejan `src`; suites grandes en carpeta + setup en `tests/helpers/progress/`.
- Commits Conventional Commits en español, **sin** `Co-Authored-By` ni firma de IA. No pushear.
- Roles `trainer` y `student`; permisos con `assertCanAccessStudent(user, studentId)` (devuelve la fila del alumno con `trainer_id`).
- Zona horaria de los puntos: `America/Argentina/Buenos_Aires`; fechas `YYYY-MM-DD`, `from`/`to` inclusivos.
- Series que cuentan: `completed = true` y `actual_reps > 0`.
- Epley: `reps = 1 → kg`; `reps > 1 → kg × (1 + reps/30)`; kg nulo → no aporta. Redondeo a 1 decimal en el modelo (la SQL devuelve crudo).
- `default_metric: "e1rm_kg"`.
- Errores: `EXERCISE_NOT_FOUND` (404, nuevo `Errors.exerciseNotFound()`), `VALIDATION_ERROR` (400), `FORBIDDEN` (403).
- Funciones SQL: `security invoker`, `revoke all ... from public, anon, authenticated`, `grant execute ... to service_role`.
- Verificación por tarea: `cd backend && npm run lint && npm test` en verde.

## Review Focus

1. **Dos sesiones el mismo día** → un solo punto que agrega las series de ambas. Test del modelo/SQL (la SQL se valida en el E2E del controlador; el modelo recibe filas ya agrupadas).
2. **Sesión a las 23:30 hora argentina** (02:30 UTC del día siguiente) → el punto cae en el día argentino. Lo cubre la SQL (`at time zone`); el E2E carga un caso así.
3. **Ejercicio de peso corporal** (todas las series con `actual_kg` nulo) → `max_kg` y `e1rm_kg` `null`, `volume_kg` 0, `pr` null. Test en Task 1 (modelo).
4. **Entrenador consulta sin `student_id`** → 400; **alumno con `student_id` de otro** → 403. Tests en Task 2.
5. **`from > to`** → 400. Test en Task 2.

---

### Task 1: Base de datos, modelo y errores

**Files:**
- Create: `backend/src/database/migrations/2026-10-29-progress.sql`
- Modify: `backend/src/database/schema/04-progress.sql` (mismo índice y funciones; si pasa 200 líneas, crear `04b-progress-functions.sql` y anotarlo en `schema/README.md`)
- Modify: `backend/src/database/checks/schema-checks.sql` si lista objetos esperados (agregar índice/funciones)
- Create: `backend/src/models/progress/progress.model.js`
- Modify: `backend/src/shared/utils/errors.js` (+ `exerciseNotFound`)
- Test: `backend/tests/unit/models/progress/progress.model.test.js`

**Interfaces:**
- Produces (SQL):
  - `exercise_progress(p_student_id uuid, p_exercise_id uuid, p_from date default null, p_to date default null)` → filas `{ date, max_kg, volume_kg, e1rm_kg, sets, reps }` (numeric crudo, una por día argentino, ascendente).
  - `last_session_kg(p_student_id uuid, p_exercise_ids uuid[])` → filas `{ exercise_id, last_session_kg }` (solo ejercicios que el alumno hizo alguna vez).
  - índice `idx_session_sets_exercise_session on session_sets (exercise_id, session_id)`.
- Produces (JS, `progress.model.js`):
  - `round1(n) → number | null`.
  - `toProgressPoints(rows) → [{ date: 'YYYY-MM-DD', max_kg, volume_kg, e1rm_kg, sets, reps }]` (números redondeados; `date` como string aunque llegue `Date`).
  - `computePr(points) → { max_kg: { value, date } | null, e1rm_kg: { value, date } | null }` (primer día que alcanza el máximo).
  - `bodySummary(metricsAsc, fields) → { [field]: { first, last, delta } | null }`.
  - `DEFAULT_METRIC = 'e1rm_kg'`.
  - `Errors.exerciseNotFound()` → 404 `EXERCISE_NOT_FOUND`.

- [ ] **Step 1:** escribir la migración: índice + las dos funciones (SQL según spec §4: join `session_sets` → `sessions`, filtros `student_id`, `exercise_id`, `completed`, `actual_reps > 0`, rango sobre `(s.started_at at time zone 'America/Argentina/Buenos_Aires')::date`, `group by` esa fecha; Epley por serie con `case when actual_reps = 1 then actual_kg else actual_kg * (1 + actual_reps / 30.0) end`; `last_session_kg`: por ejercicio, la sesión más reciente por `started_at` que lo contiene y el `max(actual_kg)` de sus series completadas), `revoke`/`grant`. Copiarla en el schema.
- [ ] **Step 2: tests que fallan del modelo:** `toProgressPoints` redondea (`79.1666 → 79.2`) y convierte `date`; `computePr` con empate devuelve el primer día; puntos con `max_kg` null (peso corporal) → `pr.max_kg` y `pr.e1rm_kg` null; `computePr([])` → ambos null; `bodySummary` con un campo que aparece recién en la 3ª medida y otro nunca cargado (→ null); `delta` redondeado.
- [ ] **Step 3:** implementar → **Step 4:** `npm run lint && npm test` verde.
- [ ] **Step 5: Commit** `feat(progress): funciones SQL de progreso, índice y modelo`.

### Task 2: Módulo `progress` (los dos endpoints)

**Files:**
- Create: `backend/src/{routes,controllers,services,repositories,validations}/progress/progress.*.js`
- Modify: `backend/src/app.js` (`app.use('/api/progress', progressRoutes)`)
- Test: `backend/tests/unit/services/progress/progress.service/*.test.js` + `backend/tests/helpers/progress/progress-service.setup.js`, `backend/tests/unit/validations/progress/progress.validation.test.js`, `backend/tests/unit/routes/progress/progress.routes.test.js`

**Interfaces:**
- Consumes: Task 1; `assertCanAccessStudent` (`services/students/student-access.service.js`); `findAccessibleExerciseIds(ids, trainerId)` (`repositories/routines/routines.repository.js`); `findExerciseById(id)` (`repositories/exercises/exercises.repository.js`); `bodyMetricsService.list(user, studentId)` (`services/body-metrics/body-metrics.service.js`); `MEASUREMENT_FIELDS` (`models/body-metrics/body-metric.model.js`).
- Produces:
  - repository: `fetchExerciseProgress({ studentId, exerciseId, from, to }) → rows` (`supabase.rpc('exercise_progress', { p_student_id, p_exercise_id, p_from, p_to })`).
  - validations: `validateExerciseProgressParams(params) → { exerciseId }`, `validateExerciseProgressQuery(query) → { student_id?, from?, to? }` (UUID en minúscula, fechas `YYYY-MM-DD` reales, `from ≤ to`), `validateBodyProgressParams(params) → { studentId }`.
  - service: `exerciseProgress(user, exerciseId, query) → { exercise: { id, name, muscle_group }, points, pr, default_metric }`, `bodyProgress(user, studentId) → { points, summary }`.

- [ ] **Step 1: tests que fallan:**
  - alumno sin `student_id` → usa `user.id`; alumno con `student_id` de otro → 403 (el mock de `assertCanAccessStudent` tira);
  - entrenador sin `student_id` → 400 `VALIDATION_ERROR` en `student_id`; entrenador con alumno suyo → llama al RPC con `p_student_id` del alumno;
  - ejercicio no visible (`findAccessibleExerciseIds` devuelve `[]`) → 404 `EXERCISE_NOT_FOUND` y no se llama al RPC;
  - `from > to` y fechas inválidas (`2026-02-30`) → 400;
  - respuesta: `exercise` con `id`, `name`, `muscle_group`; `points` del modelo; `pr`; `default_metric: 'e1rm_kg'`; sin filas → `points: []`, `pr` con nulls;
  - body: delega en `bodyMetricsService.list` (permisos incluidos) y devuelve `{ points, summary }`;
  - rutas: `GET /exercise/:exerciseId` y `GET /body/:studentId` con `authenticate` + `requireRole('trainer','student')` y validadores.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm run lint && npm test` verde.
- [ ] **Step 5: Commit** `feat(progress): curva de carga por ejercicio y evolución corporal`.

### Task 3: `last_session_kg`, ADR y documentación

**Files:**
- Modify: `backend/src/services/routines/routines.service.js` (`today`), `backend/src/models/routines/routine.model.js` (`toTodayRoutine(row, lastKgByExercise)`), y un repositorio para el RPC (`repositories/progress/progress.repository.js`: `fetchLastSessionKg(studentId, exerciseIds) → Map|object`)
- Modify: `backend/tests/unit/...` de routines (`update-and-today.test.js` asume `null`) y modelo
- Create: `docs/adr/0004-metrica-de-progreso.md`
- Modify: `docs/arquitectura/contratos-api.md` (Progress reescrito según spec §3.1–3.2; `last_session_kg` en `/routines/today`), `backend/README.md` (tabla y desvíos), `docs/tarjetas.md` (fila de la tarjeta 32), `backend/src/database/schema/README.md` si cambió el orden de archivos

**Interfaces:**
- Consumes: SQL `last_session_kg` (Task 1).
- Produces: `toTodayRoutine(row, lastKgByExercise = {})` — cada ejercicio con `last_session_kg: round1(lastKgByExercise[exercise_id]) ?? null`.

- [ ] **Step 1: tests que fallan:** `today` llama a `fetchLastSessionKg` una vez con los `exercise_id` de la rutina (no por ejercicio); ejercicio hecho → su kg redondeado; nunca hecho → `null`; rutina sin ejercicios → no llama al RPC; sin rutina hoy → igual que antes.
- [ ] **Step 2:** FAIL → **Step 3:** implementar (si `routines.service.js` pasa 200 líneas, extraer `today` a `services/routines/routine-today.service.js`).
- [ ] **Step 4:** ADR 0004 (Estado: Aceptada · Fecha 2026-10-29; Contexto; Decisión: 1RM estimado con Epley por defecto, se devuelven las tres; Alternativas: peso máximo (ruidoso), volumen (difícil de leer), Brzycki (diverge con muchas reps); Consecuencias: Epley sobreestima con > 12 reps, `reps = 1 → kg`, peso corporal sin 1RM). Docs de arriba.
- [ ] **Step 5:** `npm run lint && npm test` verde.
- [ ] **Step 6: Commits** `feat(routines): last_session_kg real en la rutina del día` y `docs: ADR de la métrica de progreso y contrato de Progress`.
