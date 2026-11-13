# GX4 · Sesión en curso y feedback pendiente — plan

> Para agentes: implementar tarea por tarea con TDD (test que falla → código → test en verde → commit).

**Objetivo:** la web del alumno crea la sesión al empezar (`POST /sessions` sin `finished_at`) y la borra al descartar (`DELETE /sessions/:id`); el PT la ve "En curso" en el Dashboard y en Alumnos, y el Dashboard muestra "Feedback pendiente".

**Arquitectura:** backend route → controller → service → repository (Supabase). Abierta = `finished_at is null` y `started_at` en las últimas 4 h (`openSince` en `session.model.js`). La web abre y cierra best-effort desde `utils/workout/openSession.js`, llamado por `useActiveWorkout`.

**Spec:** `docs/superpowers/specs/2026-11-09-gx4-sesion-en-curso-design.md`.

## Restricciones globales

- Ningún archivo pasa de 200 líneas (tests incluidos); carpetas de hasta 10 entradas; los tests copian el árbol de `src/`.
- `students.repository.js` ya tiene 200 líneas: `findOpenSessions` va en `repositories/sessions/open-sessions.repository.js`.
- Jest y Vitest con `--maxWorkers=2`, de a una suite, solo los archivos afectados mientras se itera.
- Sin SQL contra Supabase: la migración se entrega como archivo.
- `openOnServer` no hace ningún pedido si el alumno no está `authenticated` (por ejemplo, `offline` de la #102: sin token el pedido daría 401 y dispararía una renovación) y traga cualquier error.

## Foco de la revisión

- `DELETE` en una sola sentencia condicionada (`id`, `student_id`, `finished_at is null`): no pisa una subida que cerró la sesión en el medio.
- Una abierta no cuenta como hecha: historial (`findSessionsPage`) y `student_last_session` filtran `finished_at`. En la web, `week.js` y `commitment.js` ya miran `finished_at`.
- Descartar justo después de empezar: `closeOnServer` espera el POST de apertura antes del DELETE.
- Tests de la subida: el POST de apertura no consume la cola de respuestas de `stubUpload` ni aparece en sus llamadas.

---

### Tarea 1 (backend): `openSince` y `findOpenSessions`

**Archivos:** modifica `models/sessions/session.model.js`; crea `repositories/sessions/open-sessions.repository.js`; tests `tests/unit/models/sessions/session.model.test.js` y `tests/unit/repositories/sessions/open-sessions.repository.test.js`.

- [ ] Test: `openSince(now)` = `now − 4 h` en ISO; `OPEN_SESSION_MAX_HOURS = 4`.
- [ ] Test: `findOpenSessions(ids, since)` filtra `.in('student_id')`, `.is('finished_at', null)`, `.gte('started_at', since)`, ordena `started_at` desc y aplana `routine.name` → `routine_name`; con `[]` no consulta.
- [ ] Implementar y commitear.

### Tarea 2 (backend): `DELETE /sessions/:id`

**Archivos:** `repositories/sessions/sessions.repository.js` (`deleteOpenSession`), `services/sessions/sessions.service.js` (`discard`), `controllers/sessions/sessions.controller.js`, `routes/sessions/sessions.routes.js`; tests `tests/unit/services/sessions/sessions.service/discard.test.js`, `tests/unit/repositories/sessions/sessions.repository.test.js` (nuevo), `tests/unit/routes/sessions/sessions.routes.test.js`; isolation: `student-cross` (alumno B sobre la abierta de A → 404) y `wrong-role` (PT → 403); fila en `docs/proceso/auditoria-seguridad.md`.

- [ ] Tests: borra solo con `id`, `student_id` y `finished_at null`; `discard` → 404 `SESSION_NOT_FOUND` si no borró nada; la ruta exige `student` y valida el id (400).
- [ ] Caso en `create.test.js`: abrir (sin `finished_at`) y cerrar por reintento.
- [ ] Implementar y commitear.

### Tarea 3 (backend): una abierta no es una sesión hecha

**Archivos:** `repositories/sessions/session-history.repository.js` (`findSessionsPage` con `.not('finished_at', 'is', null)`), migración `database/migrations/2026-11/2026-11-09-open-sessions.sql`, `database/schema/04-progress.sql`, `database/checks/schema-checks.sql`.

- [ ] Test del repo: el historial filtra `finished_at`.
- [ ] Migración: vista `student_last_session` con `where finished_at is not null` e índice parcial `idx_sessions_open`; mismo cambio en el schema; checks de la vista filtrada y del índice.
- [ ] Commitear.

### Tarea 4 (backend): `open_session` en `GET /students` e `in_session` en el overview

**Archivos:** `services/students/students.service.js`, `models/students/overview-lists.js` (`inSessionList`), `models/students/overview.js`, `services/students/overview.service.js`; tests de `list`, `overview-lists`, `overview` y `overview.service`.

- [ ] Tests: `list` suma `open_session: { id, started_at }` (la más nueva) o `null`; `inSessionList` una por alumno, la más nueva, con nombre y rutina; `buildOverview` devuelve `in_session`; `overview()` consulta `findOpenSessions(ids, openSince())` y vacío trae `in_session: []`.
- [ ] Implementar y commitear.

### Tarea 5 (web): abrir y cerrar en el servidor

**Archivos:** `api/sessions/sessions.api.js` (`openSession`, `deleteSession`), crea `utils/workout/openSession.js`, modifica `hooks/workout/useActiveWorkout.js`; tests `tests/api/sessions/sessions.api.test.js`, `tests/utils/workout/openSession.test.js`, `tests/hooks/workout/useActiveWorkout/open.test.jsx`; helpers `tests/helpers/workout/activeWorkout.jsx` (el POST de apertura se contesta aparte).

- [ ] Tests de `openOnServer`: body sin `finished_at`; error (HTTP o no) no se propaga; sin `authenticated` no pide nada; no toca `upload`.
- [ ] Tests de `closeOnServer`: espera la apertura en vuelo; 404 y red no se propagan.
- [ ] Tests del hook: `start` abre una vez (con una abierta no reabre); `discard` borra; la subida final manda `POST /sessions` con `finished_at`.
- [ ] Correr las suites de `workout`, `WorkoutPage`, `TodayPage` y `chat` y ajustar helpers si cuentan el POST de apertura.
- [ ] Commitear.

### Tarea 6 (web): Dashboard y Alumnos del PT

**Archivos:** `components/students/overview/RecentActivity.jsx`, crea `components/students/overview/FeedbackPending.jsx`, `pages/dashboard/DashboardPage.jsx`, `hooks/students/useStudentsOverview.js` (`refetchInterval: 60_000`), `components/students/StudentCard.jsx`, `utils/students/overviewFormat.js` (`daysAgoLabel`); tests de `RecentActivity`, `FeedbackPending`, `DashboardPage`, `StudentsPage/list` y helpers `overview.js` y `fixtures.js`.

- [ ] Tests: fila "En curso" primero con `aria-label` "<nombre>, entrenando ahora"; `FeedbackPending` hasta 5 filas, "y N más", vacío y links; Dashboard con las dos; `StudentCard` con `open_session` muestra "Entrenando ahora" con `title` "Empezó a las HH:MM".
- [ ] Implementar y commitear.

### Tarea 7: docs y cierre

- [ ] `contratos-api.md` (§POST /sessions, DELETE nuevo, §GET /students, §GET /students/overview, §GET /students/:id/sessions) y `modelo-de-datos.md` (vista e índice).
- [ ] Suites completas una vez: backend (Jest + ESLint), web (Vitest + ESLint + build). `wc -l` de lo tocado.
- [ ] Push de `feature/open-sessions-gx4`.
