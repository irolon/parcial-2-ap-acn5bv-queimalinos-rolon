# Módulo Sessions en el backend — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `POST /api/sessions`, `POST /api/sessions/:id/sets` (lote idempotente) y `PATCH /api/sessions/:id` para el alumno, sobre las tablas `sessions` y `session_sets` que ya existen.

**Architecture:** módulo `sessions` con el layering del backend (routes → controllers → services → repositories → models → validations), autorización en el service (ADR 0001). El lote de series valida por serie, resuelve conflictos y referencias con consultas por lote y guarda las válidas con un solo upsert.

**Tech Stack:** Node (ESM), Express 4, supabase-js (service role), Jest ESM (`jest.unstable_mockModule`).

**Spec:** `docs/superpowers/specs/2026-10-27-sessions-backend-design.md`

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo > 200 líneas (tests incluidos); ≤ 10 archivos por carpeta; capa → módulo (`sessions`) → archivo; tests espejan `src` (`backend/tests/unit/<capa>/sessions/`), suites grandes divididas en carpeta con el nombre de la unidad y setup en `tests/helpers/sessions/`.
- Commits Conventional Commits en español, **sin** `Co-Authored-By` ni firma de IA. No pushear.
- Solo rol `student` (`requireRole('student')`); `student_id` = `req.user.id`, nunca del body.
- Respuestas `{ data }`; errores `{ error: { code, message, details } }` con `Errors.*` de `shared/utils/errors.js`.
- Sesión: `notes` ≤ 1000; `rpe` entero 1–10; `finished_at ≥ started_at`; fechas ISO 8601 **con zona** y fecha real (como `recorded_at` de body-metrics) — sin chequeo de futuro.
- Serie: `set_number` entero 1–100; `actual_reps` entero 0–1000; `actual_kg` número 0–1000 o `null`; `completed` booleano, default `true`; lote de 1 a 100 series.
- Códigos: `SESSION_NOT_FOUND` (404), `SESSION_ID_CONFLICT` (409); por serie `VALIDATION_ERROR`, `EXERCISE_NOT_FOUND`, `SET_ID_CONFLICT`. Una referencia de rutina inválida (`routine_id`, `routine_exercise_id`) no rechaza nada: se guarda como `null` (ver spec).
- Verificación por tarea: `cd backend && npm run lint && npm test` en verde.

## Review Focus

1. **Mismo lote dos veces** → 24 filas, la segunda respuesta con todas `created: false` (upsert, no insert). Test en Task 3.
2. **`id` de serie que ya está en otra sesión** (propia o ajena) → `SET_ID_CONFLICT` y la fila original intacta (el upsert NO debe incluirla). Test en Task 3.
3. **Ids en mayúsculas** (UUID del celular) → se normalizan a minúsculas antes de comparar y guardar, en sesión, series y referencias. Tests en Task 1 y Task 3.
4. **Reintento de `POST /sessions` con `started_at` distinto** → 200, `started_at` original intacto. Test en Task 2.
5. **Lote con series duplicadas por `id` dentro del mismo request** → la segunda ocurrencia va a `failed` (`VALIDATION_ERROR`, "id repetido en el lote"); Postgres rechaza un upsert con la misma clave dos veces. Test en Task 3.

---

### Task 1: Validaciones, errores y modelo

**Files:**
- Create: `backend/src/shared/utils/validators.js` (mover `UUID_RE`/`isUuid`, `isRealCalendarDateTime` desde `validations/body-metrics/body-metrics.validation.js`, que pasa a importarlos)
- Create: `backend/src/validations/sessions/sessions.validation.js`
- Create: `backend/src/models/sessions/session.model.js`
- Modify: `backend/src/shared/utils/errors.js` (+ `sessionNotFound`, `sessionIdConflict`)
- Test: `backend/tests/unit/shared/utils/validators.test.js`, `backend/tests/unit/validations/sessions/sessions.validation.test.js` (dividir en carpeta si pasa 200), `backend/tests/unit/models/sessions/session.model.test.js`

**Interfaces:**
- Produces:
  - `validators.js`: `isUuid(v): boolean`, `isIsoDateTime(v): boolean` (formato con zona + fecha real).
  - `validateCreateSession(body) → { id, routine_id|null, started_at, finished_at|null, rpe|null, notes|null }` (ids en minúscula; tira `Errors.validation` con `details[{field,message}]`).
  - `validateUpdateSession(body) → { finished_at?, rpe?, notes? }` (al menos uno; tira si vacío).
  - `validateSessionIdParam(params) → { id }`.
  - `validateSetsEnvelope(body) → { sets: unknown[] }` (tira si no es array de 1–100).
  - `parseSet(raw) → { ok: true, value: SetRow } | { ok: false, details: [{field,message}] }` donde `SetRow = { id, exercise_id, original_exercise_id|null, routine_exercise_id|null, set_number, actual_reps, actual_kg|null, completed, executed_at }` (ids en minúscula, `executed_at` tal cual llega).
  - `session.model.js`: `SESSIONS_TABLE = 'sessions'`, `SESSION_SETS_TABLE = 'session_sets'`, `SESSION_COLUMNS = 'id, student_id, routine_id, started_at, finished_at, rpe, notes, has_modifications'`, `isSubstitution(set): boolean` (`original_exercise_id` no nulo y ≠ `exercise_id`).
  - `Errors.sessionNotFound()` → 404 `SESSION_NOT_FOUND`; `Errors.sessionIdConflict()` → 409 `SESSION_ID_CONFLICT`.

- [ ] **Step 1: Tests que fallan** — `validateCreateSession`: válido mínimo (`id`, `started_at`) → defaults `null`; id en mayúsculas → minúscula; `started_at` sin zona → error en `started_at`; `finished_at` anterior a `started_at` → error en `finished_at`; `rpe` 0 y 11 → error; `notes` de 1001 → error. `validateUpdateSession({})` → error; `{ rpe: 7 }` → `{ rpe: 7 }`. `validateSetsEnvelope`: `{}`, `{ sets: [] }`, 101 elementos → error; 24 → ok. `parseSet`: válido → `ok` con `completed: true` por defecto; `actual_reps: 0` ok; `actual_kg: null` ok; `set_number: 0`, `actual_reps: 2.5`, `actual_kg: -1`, `executed_at: '2026-02-30T10:00:00Z'` → `ok: false` con el campo; `executed_at` en el futuro → ok. `isSubstitution`: igual o null → false; distinto → true. Tests de body-metrics existentes siguen verdes tras mover los helpers.
- [ ] **Step 2:** correr `npx jest tests/unit/validations/sessions tests/unit/shared tests/unit/models/sessions` → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `npm run lint && npm test` → verde.
- [ ] **Step 5: Commit** `feat(sessions): validaciones y modelo del módulo de sesiones`.

### Task 2: Crear y cerrar la sesión

**Files:**
- Create: `backend/src/repositories/sessions/sessions.repository.js`, `backend/src/services/sessions/sessions.service.js`, `backend/src/controllers/sessions/sessions.controller.js`, `backend/src/routes/sessions/sessions.routes.js`
- Modify: `backend/src/app.js` (`app.use('/api/sessions', sessionsRoutes)`)
- Test: `backend/tests/unit/services/sessions/sessions.service/{create,update}.test.js` + `backend/tests/helpers/sessions/sessions-service.setup.js`, `backend/tests/unit/routes/sessions/sessions.routes.test.js`

**Interfaces:**
- Consumes: Task 1.
- Produces (repository):
  - `insertSession(fields) → session | null` (`null` si `23505`).
  - `findSessionById(id) → session | null`.
  - `updateSession(id, fields) → session`.
  - `isRoutineOfStudent(routineId, studentId) → boolean`.
- Produces (service): `create(studentId, body) → { session, created: boolean }`, `update(studentId, sessionId, body) → session`, `getOwnedSession(studentId, sessionId) → session` (404 `SESSION_NOT_FOUND` si no existe o es ajena; la usa Task 3).
- Rutas: `router.use(authenticate, requireRole('student'))`; `POST /` → 201/200; `PATCH /:id` → 200.

- [ ] **Step 1: Tests que fallan** (service con repo mockeado):
  - create nuevo → `insertSession` con `student_id` del token → `{ created: true }`;
  - `routine_id` de otra persona (`isRoutineOfStudent` false) → `VALIDATION_ERROR` con `field: 'routine_id'`;
  - reintento (insert → `null`, existente del alumno) → `updateSession` solo con `finished_at`/`rpe`/`notes` que vinieron, `{ created: false }`; con `started_at` y `routine_id` distintos no se envían en el update (Review Focus 4); sin campos nuevos no llama a `updateSession`;
  - existente de otro alumno → 409 `SESSION_ID_CONFLICT`;
  - update de sesión ajena o inexistente → 404 `SESSION_NOT_FOUND`;
  - update con `finished_at` anterior al `started_at` guardado → `VALIDATION_ERROR` en `finished_at`;
  - rutas: `POST /` y `PATCH /:id` con `authenticate` + `requireRole('student')`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm run lint && npm test` verde.
- [ ] **Step 5: Commit** `feat(sessions): POST /sessions idempotente y PATCH para cerrar la sesión`.

### Task 3: Lote de series, documentación

**Files:**
- Create: `backend/src/services/sessions/session-sets.service.js`, `backend/src/repositories/sessions/session-sets.repository.js`
- Modify: `sessions.controller.js`, `sessions.routes.js` (`POST /:id/sets`), `docs/arquitectura/contratos-api.md` (módulo Sesiones), `backend/README.md` (tabla y desvíos), `docs/tarjetas.md` (fila de la tarjeta 29)
- Test: `backend/tests/unit/services/sessions/session-sets.service/*.test.js` (+ setup en `tests/helpers/sessions/`), rutas.

**Interfaces:**
- Consumes: `getOwnedSession` (Task 2), `parseSet`, `validateSetsEnvelope`, `isSubstitution` (Task 1); `findAccessibleExerciseIds(ids, trainerId)` de `repositories/routines/routines.repository.js`; `findStudentById(id)` de `repositories/students/students.repository.js` (para `trainer_id`).
- Produces (repository): `findSetsByIds(ids) → [{ id, session_id }]`, `findRoutineExerciseIds(routineId, ids) → string[]`, `upsertSets(rows) → [{ id }]` (`onConflict: 'id'`), `markSessionModified(sessionId) → void`.
- Produces (service): `addSets(studentId, sessionId, body) → { saved: [{ id, created }], failed: [{ id, index, code, message }] }`.

Algoritmo de `addSets` (en este orden):
1. `getOwnedSession` (404 si no) y `validateSetsEnvelope`.
2. `parseSet` por índice; inválidas → `failed` (`VALIDATION_ERROR`, mensaje del primer detalle); `id` repetido en el lote → la segunda a `failed`.
3. `findSetsByIds` de las válidas: existente con otro `session_id` → `SET_ID_CONFLICT`; existente en esta sesión → `created: false`.
4. Ejercicios: un `findAccessibleExerciseIds` con todos los `exercise_id` y `original_exercise_id` (trainer del alumno); faltante → `EXERCISE_NOT_FOUND`.
5. `routine_exercise_id` no nulos: si la sesión no tiene `routine_id` → todos se guardan con `routine_exercise_id: null`; si tiene, un `findRoutineExerciseIds`; los que no estén → `null` (la serie se guarda igual).
6. `upsertSets` con las que quedan (con `session_id`); si ninguna, no se llama.
7. Si alguna guardada `isSubstitution` → `markSessionModified`.

- [ ] **Step 1: Tests que fallan:**
  - 24 series válidas → `upsertSets` una vez con 24 filas, `saved` 24 `created: true`, `failed` vacío;
  - **"caso feo"**: mismo lote con `findSetsByIds` devolviendo las 24 en esta sesión → `upsertSets` con 24, todas `created: false` (Review Focus 1);
  - corrección: misma serie con otro `actual_kg` → el upsert lleva el valor nuevo;
  - serie cuyo id está en otra sesión → `failed` `SET_ID_CONFLICT`, no está en el upsert (Review Focus 2);
  - id en mayúsculas existente en minúsculas → reconocido como la misma serie (Review Focus 3);
  - id repetido dentro del lote → segunda a `failed` (Review Focus 5);
  - ejercicio inaccesible → `EXERCISE_NOT_FOUND`; `original_exercise_id` inaccesible → igual;
  - `routine_exercise_id` ajeno → la serie se guarda con `routine_exercise_id: null`; sesión sin rutina con `routine_exercise_id` → idem;
  - lote mixto: válidas guardadas, inválidas con su `index`;
  - sustitución → `markSessionModified`; sin sustitución → no; todas fallidas → ni upsert ni mark;
  - sesión cerrada (`finished_at` no nulo) → se guardan igual;
  - sesión ajena → 404 y nada se consulta después;
  - ruta `POST /:id/sets` con `requireRole('student')`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar (archivos ≤ 200 líneas; si el service crece, separar la clasificación de series en `services/sessions/classifySets.js`).
- [ ] **Step 4:** actualizar `contratos-api.md` (los tres endpoints con bodies, respuestas y códigos del spec §3; quitar `/session-sets` y `substituted_exercise_id`), `backend/README.md` y `docs/tarjetas.md`.
- [ ] **Step 5:** `npm run lint && npm test` verde.
- [ ] **Step 6: Commit** `feat(sessions): lote de series idempotente con sustituciones` y `docs: contrato del módulo Sessions` (o uno solo si es chico).
