# Gamificación en el backend — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** logros con la regla como dato, racha contra los días asignados guardada en `student_streaks`, desafíos con CRUD/asignación/progreso, evaluación post-sesión y job diario.

**Architecture:** funciones puras en `models/gamification/` (racha, semanas completas, criterios, progreso); un `evaluateStudent(studentId)` en `services/gamification/` que arma los datos, persiste racha/logros/progreso y devuelve lo desbloqueado; lo llaman Sessions y el job diario. Endpoints en el módulo `gamification` con el layering del backend; autorización en services (ADR 0001).

**Tech Stack:** Node ESM, Express, supabase-js (service role), Postgres (Supabase), Jest ESM.

**Spec:** `docs/superpowers/specs/2026-10-30-gamification-backend-design.md` (decisiones Q1–Q13; leerlo antes de cada tarea).

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código > 200 líneas (tests y `.sql` incluidos); ≤ 10 archivos por carpeta; capa → módulo (`gamification`) → archivo; tests espejan `src`; suites grandes en carpeta + setup en `tests/helpers/gamification/`.
- Commits Conventional Commits en español, **sin** `Co-Authored-By` ni firma de IA. No pushear.
- Zona horaria `America/Argentina/Buenos_Aires`; fechas locales `YYYY-MM-DD`; semana lunes–domingo; `routines.days` son nombres en inglés en minúscula (`sunday`…`saturday`).
- Sesión que cuenta = `finished_at` no nulo. Récords = `session_records(p_student_id, p_session_ids)` (ya existe en la rama base).
- Permisos: `assertCanAccessStudent(user, studentId)` para `/students/:id/...`; desafío visible = global (`trainer_id` null) o del entrenador del alumno; editar/borrar solo el trainer dueño.
- Errores nuevos: `CHALLENGE_NOT_FOUND` 404, `CHALLENGE_IN_USE` 409, `CHALLENGE_ALREADY_ACTIVE` 409 (+ `VALIDATION_ERROR` 400, `FORBIDDEN` 403).
- La evaluación nunca rompe la respuesta de Sessions: try/catch + `console.error`.
- Verificación por tarea: `cd backend && npm run lint && npm test` (usar `npm test`, no `npx jest`).

## Review Focus

1. Racha: día asignado sin entrenar corta; no asignado no corta y suma si se entrenó; hoy no corta; sin rutina = todos asignados; `longest_days` con la misma regla.
2. Otorgar dos veces el mismo logro no duplica (on conflict do nothing) y solo se devuelven los nuevos.
3. Hook en Sessions: `PATCH` con `finished_at`, `POST` ya cerrado y `POST …/sets` sobre sesión cerrada; un error del evaluador no cambia la respuesta.
4. Desafíos: asignación activa repetida → 409; vencido → `failed` solo en el job; meta alcanzada → `completed` + logro premio.
5. Job diario idempotente; el scheduler no arranca con `NODE_ENV=test` ni con `CRON_ENABLED` apagado.

---

### Task 1: Base de datos, seeds y modelos puros

**Files:**
- Create: `backend/src/database/migrations/2026-10-30-gamification.sql`, `backend/src/database/seeds/achievements.sql`, `backend/src/database/seeds/challenges.sql`
- Modify: `backend/src/database/schema/05-gamification.sql`, `07-rls.sql`, `backend/src/database/checks/schema-checks.sql`, `backend/src/database/checks/check-anon-access.js`, `backend/src/database/schema/README.md` (y el README de seeds si existe)
- Create: `backend/src/models/gamification/{streak.js,criteria.js,challenge-progress.js,gamification.model.js}` y un helper de fecha local AR (en `shared/utils/` si no existe uno)
- Modify: `backend/src/shared/utils/errors.js` (3 factories)
- Test: `backend/tests/unit/models/gamification/…`

**Interfaces (produces):**
- `localDate(date | string) → 'YYYY-MM-DD'` en hora AR.
- `computeStreak({ trainedDates: string[], assignedDays: string[], today: 'YYYY-MM-DD' }) → { current_days, longest_days, last_trained_date }`.
- `countFullWeeks({ trainedDates, assignedDays, today }) → number` (0 si `assignedDays` vacío).
- `evaluateCriteria(achievements, facts) → achievement[]` donde `facts = { sessionsCount, longestStreak, prSessions, fullWeeks }`; mapa `CRITERIA = { sessions_count, streak, pr_count, full_week, challenge }` (`challenge` siempre false); tipo desconocido → false.
- `challengeProgress({ goal_type, goal_value }, facts) → { current_progress, progress_pct, reached }` con `facts` según tipo (`sessionsInWindow`, `volumeInWindow`, `bestStreakInWindow`, `startWeight`, `lastWeight`).
- Constantes: `GOAL_TYPES`, `CHALLENGE_STATUS`, columnas.

- [ ] Step 1: SQL (spec §5) + seeds (spec §3.2 y Q12).
- [ ] Step 2: tests que fallan de los modelos (todos los casos del Review Focus 1, semanas completas con semana actual cumplida y semana sin rutina, cada criterio, progreso de los 4 tipos incl. `weight_target` bajando y subiendo y sin medidas).
- [ ] Step 3: implementar hasta verde; lint + test; commit `feat(gamification): schema, seeds y reglas de racha, logros y desafíos`.

### Task 2: Evaluador y endpoints de lectura

**Files:**
- Create: `backend/src/repositories/gamification/*.repository.js`, `backend/src/services/gamification/{evaluate.service.js,achievements.service.js}`, `controllers/gamification/*`, `routes/gamification/*`, `validations/gamification/*`
- Modify: `backend/src/app.js` (`/api/achievements`), `backend/src/routes/students/students.routes.js` (`/:id/achievements`, `/:id/streak`)
- Test: `backend/tests/unit/{repositories,services,routes,validations}/gamification/…`, helpers en `tests/helpers/gamification/`

**Interfaces:**
- `evaluateStudent(studentId, { now = new Date() } = {}) → { unlocked: [{ code, name, category }], streak }`: lee sesiones cerradas (`started_at`, `id`), días de rutinas activas, `session_records` de las sesiones cerradas, catálogo y desbloqueados; upsert `student_streaks`; inserta los logros que cumplen (`context` según spec Q11); actualiza progreso de asignaciones activas (y `completed` + logro premio). Idempotente.
- Endpoints de spec §4: `GET /achievements`, `GET /students/:id/achievements`, `GET /students/:id/streak`.

- [ ] Step 1: tests que fallan (service con repos mockeados: primera sesión → `FIRST_SESSION`; segunda corrida → `unlocked` vacío; racha de 7 asignados → `STREAK_7_DAYS`; desafío alcanzado → `completed` + premio; permisos de los 3 endpoints).
- [ ] Step 2: implementar; lint + test; commit `feat(gamification): evaluador de logros y endpoints de logros y racha`.

### Task 3: Hook en Sessions

**Files:** Modify `backend/src/services/sessions/{sessions.service.js,session-sets.service.js}` (y el controller de `PATCH` si hace falta para `unlocked_achievements`). Test en `backend/tests/unit/services/sessions/…`.

- [ ] Step 1: tests que fallan: `PATCH` con `finished_at` llama a `evaluateStudent` y devuelve `unlocked_achievements`; sin `finished_at` no evalúa; `POST` que llega cerrado evalúa; `POST …/sets` sobre sesión cerrada evalúa; si `evaluateStudent` tira, la respuesta es la misma y `unlocked_achievements: []`.
- [ ] Step 2: implementar (sin pasar las 200 líneas); lint + test; commit `feat(sessions): evaluar logros al cerrar la sesión`.

### Task 4: Desafíos — CRUD y asignación

**Files:** `services/gamification/challenges.service.js` (+ `challenge-assignments.service.js` si hace falta), repos, controllers, routes (`/api/challenges`, `/students/:id/challenges`), validations. Tests espejo.

- [ ] Step 1: tests que fallan (crear/editar/borrar del dueño; global o ajeno → 404; borrar con activas → 409; asignar por alumno y en lote con `skipped`; repetido → 409; alumno toma un desafío de su entrenador o global; listado con `progress_pct`).
- [ ] Step 2: implementar; lint + test; commit `feat(gamification): CRUD y asignación de desafíos`.

### Task 5: Job diario y scheduler

**Files:** `backend/src/jobs/{daily-gamification.js,scheduler.js}` (o la carpeta que cuadre con CONTRIBUTING), `backend/src/server.js`, `backend/src/config/env.js` (`CRON_ENABLED`), `backend/scripts/gamification-daily.js`, `backend/package.json` (`gamification:daily`), `.env.example`. Tests espejo.

- [ ] Step 1: tests que fallan (vencidos → `failed`; recalcula a cada alumno activo con al menos una sesión; un alumno que falla no corta al resto; `msUntilNext(03:00 AR, now)`; no arranca en test ni con `CRON_ENABLED=false`).
- [ ] Step 2: implementar; lint + test; commit `feat(gamification): job diario de desafíos vencidos y rachas`.

### Task 6: Documentación

- [ ] ADR 0005 (formato de los ADR existentes), `contratos-api.md` (Gamificación + `unlocked_achievements` en `PATCH /sessions/:id`), `modelo-de-datos.md`, `backend/README.md`, `docs/tarjetas.md`, `docs/proceso/setup-tecnico.md` (`CRON_ENABLED`, seeds nuevos). Commit `docs: tarjeta 41 (gamificación backend)`.
