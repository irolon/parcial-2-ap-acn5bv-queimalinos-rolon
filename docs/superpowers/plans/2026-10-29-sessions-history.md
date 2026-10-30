# Historial de sesiones y comentarios del entrenador — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** historial paginado de sesiones con detalle real vs planificado, récords y comentario del entrenador, en el backend y en la ficha del alumno en la web.

**Architecture:** backend: función SQL `session_records` + sub-router `students/:id/sessions` (lista y detalle) + `PATCH /sessions/:id/comment` con roles por ruta; web: módulo `sessions` con `SessionsHistory` (react-query infinita) en la ficha.

**Tech Stack:** Node/Express/supabase-js/Jest (backend); React 19, React Router 7, TanStack Query, Tailwind, Vitest + Testing Library (web).

**Spec:** `docs/superpowers/specs/2026-10-29-sessions-history-design.md`

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código > 200 líneas (tests y `.sql` incluidos); ≤ 10 archivos por carpeta (`frontend/src/components/shared/ui` está lleno: no agregar ahí); capa → módulo (`sessions`) → archivo; tests espejan `src`; suites grandes en carpeta con el nombre de la unidad.
- Commits Conventional Commits en español, **sin** `Co-Authored-By` ni firma de IA. No pushear. No ejecutar SQL contra ninguna base (lo hace el controlador).
- Paginación: `page` desde 1 (default 1), `limit` default 20 máx 100, inválidos al default; `{ data, meta: { total, page, limit, total_pages } }`.
- Series que cuentan (sets, volumen, récords): `completed = true` y `actual_reps > 0`; Epley `reps = 1 → kg`, `reps > 1 → kg × (1 + reps/30)`, kg nulo no aporta; récord = supera estrictamente a todas las sesiones anteriores; la primera vez no cuenta.
- Comentario: ≤ 1000; `""`/`null` → `null`; solo el entrenador del alumno; si no → 404 `SESSION_NOT_FOUND`.
- Funciones SQL: `security invoker`, `set search_path = public`, revoke a `public, anon, authenticated`, grant a `service_role`.
- Textos de la web en español rioplatense; tokens y medidas del prototipo según spec §3.
- Verificación por tarea: `npm run lint && npm test` del lado tocado en verde.

## Review Focus

1. **Sesión sin cerrar** (`finished_at` null) → `duration_min` null y la web muestra "—" sin romper. Tests en Task 2 (back) y Task 4 (web).
2. **Sesión sin rutina o con la rutina borrada** → `routine: null`, `planned: null` en sus series, la web muestra "Sesión libre" y "sin plan". Tests en Task 2 y Task 4.
3. **Comentario que un alumno intenta escribir** → 403 (rol); **entrenador de otro alumno** → 404. Tests en Task 3.
4. **Doble Guardar / Ctrl+Enter repetido** en el comentario → un solo PATCH. Test en Task 4.
5. **Récord empatado** (igual al mejor anterior) → no es récord. Lo cubre la SQL (E2E); test del mapeo en Task 2.

---

### Task 1: SQL de récords y modelo del historial (backend)

**Files:**
- Create: `backend/src/database/migrations/2026-10-29-sessions-history.sql`; Modify: `backend/src/database/schema/04-progress.sql` (si pasa 200 líneas, archivo nuevo `04c-sessions-history.sql` + `schema/README.md`); `backend/src/database/checks/schema-checks.sql` (función esperada)
- Create: `backend/src/models/sessions/session-history.model.js`
- Test: `backend/tests/unit/models/sessions/session-history.model.test.js`

**Interfaces:**
- Produces (SQL): `session_records(p_student_id uuid, p_session_ids uuid[]) → table (session_id uuid, exercise_id uuid)` (spec §2.4).
- Produces (JS): `durationMin(startedAt, finishedAt) → number|null`; `summarizeSets(sets) → { sets, volume_kg }` (solo series que cuentan; volumen a 1 decimal); `toSessionSummary(row, { sets, recordsBySession }) → summary` (forma de spec §2.1); `groupSetsByExercise(sets, { exercisesById, plannedByRoutineExercise, recordExerciseIds }) → exercises[]` (forma de spec §2.2, orden por primer `executed_at`).

- [ ] **Step 1:** migración + schema + check (sin ejecutar).
- [ ] **Step 2: tests que fallan:** `durationMin` (54 min, sin cerrar → null, redondeo); `summarizeSets` (ignora no completadas y 0 reps; kg nulo suma 0; redondeo); `toSessionSummary` (routine null; `has_pr` true si la sesión tiene récords; `trainer_comment`); `groupSetsByExercise` (agrupa por ejercicio hecho y original; `original_exercise` null sin sustitución; `planned` null sin enlace; `is_pr`; orden).
- [ ] **Step 3:** implementar → **Step 4:** `cd backend && npm run lint && npm test` → **Step 5: Commit** `feat(sessions): función de récords y modelo del historial`.

### Task 2: Endpoints de historial (backend)

**Files:**
- Create: `backend/src/routes/sessions/student-sessions.routes.js` (sub-router `mergeParams`, montado en `/api/students/:id/sessions` como `body-metrics`), `controllers/sessions/session-history.controller.js`, `services/sessions/session-history.service.js`, `repositories/sessions/session-history.repository.js`, validaciones de query/params
- Test: `backend/tests/unit/services/sessions/session-history.service/*.test.js` + setup en `tests/helpers/sessions/`, rutas, validaciones

**Interfaces:**
- Consumes: Task 1; `assertCanAccessStudent`; repos de ejercicios/rutinas para nombres y plan (consultas por lote con `.in(...)`).
- Produces: `listSessions(user, studentId, { page, limit }) → { data, meta }`; `getSessionDetail(user, studentId, sessionId) → detail`; repository `findSessionsPage`, `findSetsForSessions(sessionIds)`, `fetchSessionRecords(studentId, sessionIds)` (`rpc`), `findRoutinesByIds`, `findRoutineExercisesByIds`, `findExercisesByIds`.

- [ ] **Step 1: tests que fallan:** paginación y `meta` (`range` correcto, defaults, `limit` > 100 → 100); orden; permisos (mock de `assertCanAccessStudent` que tira → 403 y no consulta); resumen completo (duración, volumen, `has_pr` desde el RPC, routine null); detalle de sesión de otro alumno → 404; detalle con sustitución, `planned` null, `is_pr`; consultas por lote (una por tabla, no por sesión).
- [ ] **Step 2–4:** FAIL → implementar → verde. **Step 5: Commit** `feat(sessions): historial paginado y detalle de sesiones del alumno`.

### Task 3: Comentario del entrenador y docs (backend)

**Files:**
- Modify: `backend/src/routes/sessions/sessions.routes.js` (roles por ruta), `controllers/sessions/…`, `services/sessions/…` (nuevo `commentSession(user, sessionId, body)`), validación del body; tests de rutas existentes (`sessions.routes.test.js` asume `requireRole('student')` global)
- Modify: `docs/arquitectura/contratos-api.md` (§2.1–2.3, incl. `trainer_comment`), `backend/README.md`, `docs/tarjetas.md` (fila de la tarjeta 33)

- [ ] **Step 1: tests que fallan:** entrenador del alumno → guarda y devuelve el resumen; `""` → `null`; > 1000 → 400; entrenador ajeno o sesión inexistente → 404; alumno → 403 por rol; las rutas del alumno (`POST /sessions`, `/:id/sets`, `PATCH /:id`) siguen exigiendo `student`.
- [ ] **Step 2–4:** FAIL → implementar → verde. **Step 5:** docs. **Commits** `feat(sessions): comentario del entrenador en la sesión` y `docs: contrato del historial de sesiones`.

### Task 4: Bloque "Últimas sesiones" en la web

**Files:**
- Create: `frontend/src/api/sessions/sessions.api.js`, `frontend/src/hooks/sessions/useSessions.js` (`useSessionsInfinite(studentId)`, `useSessionDetail(studentId, sessionId, { enabled })`, `useCommentSession(studentId)`), `frontend/src/components/sessions/` (`SessionsHistory.jsx`, `SessionRow.jsx`, `SessionDetail.jsx`, `SessionComment.jsx`), `frontend/src/utils/sessions/format.js` (`formatSessionDate(iso) → '22 ABR'`, `formatDuration(min) → '54′'`)
- Modify: `frontend/src/pages/students/StudentProfilePage.jsx` (≤ 200 líneas), `frontend/tests/helpers/students/students.js` (stub de `/students/:id/sessions`, detalle y `PATCH /sessions/:id/comment`)
- Test: `frontend/tests/components/sessions/…`, `frontend/tests/utils/sessions/format.test.js`, y un test de página

- [ ] **Step 1: tests que fallan:** fila (fecha, duración, rutina o "Sesión libre", PR, Modificada, RPE con `hot` ≥ 8, "—"); el comentario del entrenador antes que la nota; expandir → pide el detalle una vez y muestra series con real vs plan (clases good/hot), "en lugar de", "sin plan", "no hecha"; comentario: aparecen Guardar/Cancelar al cambiar, Cancelar vuelve, Ctrl+Enter guarda, doble click → un PATCH, error inline; "Cargar más" suma página y desaparece en la última; vacío "Todavía no entrenó"; error con "Reintentar"; formatos de fecha/duración.
- [ ] **Step 2–4:** FAIL → implementar (tokens y medidas del prototipo, spec §3) → `cd frontend && npm run lint && npm test` verde. **Step 5: Commit** `feat(web): últimas sesiones del alumno con detalle, récords y comentario`.
