# Notificaciones — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** módulo Notifications (tabla fuente de verdad + push FCM HTTP v1 best-effort), registro de tokens, disparadores (rutina modificada, récord, logro, comentario) y job nocturno de inactividad contra los días asignados con límite semanal.

**Architecture:** funciones puras en `models/notifications/` (textos, política de push) y `missedAssignedDays` en `models/gamification/streak.js`; `fcm.client` + `notify.service` (inserta y despacha, nunca tira); `triggers.service` llamado desde Sessions; job `runInactivityAlerts` en el scheduler de las 03:00.

**Tech Stack:** Node ESM, Express, supabase-js, `jsonwebtoken` (RS256 para OAuth de Google), `fetch` nativo, Jest ESM.

**Spec:** `docs/superpowers/specs/2026-10-30-notifications-design.md` (Q1–Q13; leerlo antes de cada tarea).

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código > 200 líneas (tests y `.sql` incluidos); ≤ 10 archivos por carpeta; capa → módulo (`notifications`) → archivo; tests espejan `src`; helpers en `tests/helpers/notifications/`.
- Commits Conventional Commits en español, **sin** `Co-Authored-By` ni firma de IA. No pushear.
- Zona horaria `America/Argentina/Buenos_Aires` (`localDate` en `shared/utils/dates.js`); días asignados = unión de `days` de rutinas activas (vacío = todos).
- La notificación se guarda **siempre**; el push es best-effort, sin reintentos; sin credenciales FCM el push es no-op.
- Ningún disparador ni el job rompen la operación que los origina: try/catch + `console.error('[notifications] …')`.
- Errores nuevos: `NOTIFICATION_NOT_FOUND` 404 (+ `VALIDATION_ERROR` 400).
- Nunca loguear ni commitear la clave privada de la cuenta de servicio.
- Verificación por tarea: `cd backend && npm run lint && npm test` (usar `npm test`).

## Review Focus

1. La notificación queda en la base aunque FCM falle o no haya credenciales/tokens.
2. `UNREGISTERED`/404 de FCM borra ese token; otros errores no.
3. Inactividad: ≥ 3 días asignados perdidos; hoy no cuenta; límite de 7 días por alumno.
4. `routine_modified` una sola vez por sesión aunque lleguen más series; `pr` una por sesión.
5. Push resumen de logros solo en el cierre de sesión; los del job, sin push.

---

### Task 1: Base de datos y modelos puros

**Files:** migración `backend/src/database/migrations/2026-10-30-notifications.sql`; `schema/06-ai-and-agenda.sql`, `07-rls.sql`, `checks/schema-checks.sql`, `checks/check-anon-access.js`, `schema/README.md`; `backend/src/models/notifications/{notification.model.js,texts.js,push-policy.js}`; `missedAssignedDays` en `backend/src/models/gamification/streak.js`; `Errors.notificationNotFound` en `shared/utils/errors.js`. Tests espejo.

**Interfaces:** `missedAssignedDays({ lastDate, assignedDays, today }) → number`; `texts.inactivity({ studentName, daysSince, missed })`, `texts.routineModified({ studentName, date, substitutions:[{from,to}] })`, `texts.prForStudent({ exerciseNames, date })`, `texts.prForTrainer({ studentName, exerciseNames })`, `texts.achievementForStudent({ name, description })`, `texts.achievementsSummary(names)`, `texts.achievementForTrainer({ studentName, name })`, `texts.comment({ date, comment })` → `{ title, body }` (título recortado a 150); `PUSH_POLICY` / `shouldPush(type, role, { fromJob })`; constantes `NOTIFICATION_TYPES`, `INACTIVITY_MISSED_DAYS = 3`, `INACTIVITY_COOLDOWN_DAYS = 7`, columnas.

- [ ] SQL (spec §5) → tests que fallan de modelos → implementar → lint + test → commit `feat(notifications): schema de tokens y datos, textos y regla de inactividad`.

### Task 2: Envío — cliente FCM y `notify`

**Files:** `backend/src/services/notifications/{fcm.client.js,notify.service.js}`, `backend/src/repositories/notifications/{notifications.repository.js,push-tokens.repository.js}`, `backend/src/config/env.js` (`FCM_SERVICE_ACCOUNT_PATH`, `FCM_SERVICE_ACCOUNT_JSON`), `backend/.env.example`. Tests espejo (mockear `fetch`).

**Interfaces:** `loadServiceAccount()` (path o base64; null si no hay); `getAccessToken()` (JWT RS256 `iss`=client_email, `scope`=`https://www.googleapis.com/auth/firebase.messaging`, `aud`=`https://oauth2.googleapis.com/token`, exp 1 h; POST grant_type `urn:ietf:params:oauth:grant-type:jwt-bearer`; cache hasta 60 s antes de vencer); `sendToToken(token, { title, body, data }) → { ok } | { ok:false, reason:'unregistered'|'invalid'|'other', status }` (`data` con valores string); `isFcmEnabled()`. `notify({ userId, userRole, type, title, body, data = {}, push = true }) → notification` (inserta; si `push` y FCM habilitado, envía a todos los tokens; `push_sent_at` si alguno salió; borra los `unregistered`; nunca tira por el push).

- [ ] Tests que fallan (sin credenciales → no-op y fila guardada; token cacheado; `UNREGISTERED` y 404 borran; 500 no borra; error de red no rompe) → implementar → lint + test → commit `feat(notifications): envío con FCM HTTP v1 y guardado como fuente de verdad`.

### Task 3: Endpoints

**Files:** routes/controllers/services/validations `notifications`; montar `/api/notifications` en `app.js`. Tests espejo.

- [ ] Endpoints de spec §4 con tests (paginación `before`, `unread_count`, ajena → 404, tokens upsert 201/200 y reasignación, delete idempotente, validaciones) → lint + test → commit `feat(notifications): listado, leídas y registro de tokens`.

### Task 4: Disparadores

**Files:** `backend/src/services/notifications/triggers.service.js` (+ repos que falten: nombre del alumno, ejercicios, `session_records` de una sesión, existencia de `routine_modified` por `session_id`); hooks en `services/sessions/session-sets.service.js` (modificada), en el cierre de sesión (donde hoy se llama `safeEvaluate`: récords + logros con push resumen), y en `services/sessions/session-history.service.js` (`commentSession`). Tests espejo.

- [ ] Tests que fallan (una `routine_modified` por sesión; `pr` una por sesión con push al alumno y fila sin push al PT; logros al cerrar → una fila por logro + un push resumen; comentario vacío no notifica; un error del disparador no cambia la respuesta) → implementar → lint + test → commit `feat(notifications): avisos de rutina modificada, récords, logros y comentarios`.

### Task 5: Job de inactividad y scheduler

**Files:** `backend/src/services/notifications/inactivity-job.service.js` (+ repo), scheduler de `services/gamification/scheduler.js` generalizado a una lista de jobs (o movido a un lugar compartido si encaja con CONTRIBUTING), `server.js`, `backend/scripts/notifications-inactivity.js`, `package.json` (`notifications:inactivity`). Tests espejo.

- [ ] Tests que fallan (3 asignados perdidos → notifica al PT; 2 → no; límite de 7 días; sin sesiones → desde `created_at`; alumno inactivo/de baja no; un alumno que falla no corta al resto; scheduler corre los dos jobs aunque uno falle) → implementar → lint + test → commit `feat(notifications): alerta nocturna de inactividad contra los días asignados`.

### Task 6: Documentación

- [ ] ADR 0006, `contratos-api.md`, `modelo-de-datos.md`, CU-10, `backend/README.md`, `setup-tecnico.md` (pasos de Firebase: crear proyecto, generar cuenta de servicio, variables, `google-services.json` para Igna), `docs/tarjetas.md`. Commit `docs: tarjeta 44 (notificaciones)`.
