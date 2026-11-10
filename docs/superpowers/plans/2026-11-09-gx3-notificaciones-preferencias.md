# GX3 · Preferencias de notificación del alumno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el alumno elija desde Mi perfil qué tipos de aviso (mensajes, comentarios, turnos, récords, logros) le llegan como push al celular, sin perder la notificación guardada en la bandeja.

**Architecture:** tabla `notification_preferences` (una fila por alumno, una columna booleana por tipo, sin fila = todo prendido); `GET/PUT /notifications/preferences` solo alumno (route → controller → service → repository → model); el filtro vive en **un solo lugar**: la primera línea de `pushToUser` en `notify.service.js` lee `payload.data.type` y, si está apagado o la lectura falla, no manda (la fila de `notifications` ya se guardó). Web: fila "Notificaciones" en la tarjeta "Cuenta" de GX1 (solo alumno) y un diálogo con cinco interruptores.

**Tech Stack:** Express + Supabase (service_role); Jest ESM (`jest.unstable_mockModule`). React + TanStack Query + zustand; Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-09-gx3-notificaciones-preferencias-design.md` (manda sobre este plan; CONTRIBUTING manda sobre los dos).

## Notas (spec vs. código real)

1. **Rama.** El spec sugiere `feature/notification-preferences`; se trabaja en `feature/notification-prefs-gx3` (worktree `C:\ft-gx3x`), apilada sobre `feature/profile-editable-gx2` (GX2) → GX1 → #89. La PR apunta a la rama de GX2 hasta que entre a `develop`; antes de abrirla, `git merge origin/develop`.
2. **Migración.** El SQL del spec no trae encabezado ni `notify pgrst, 'reload schema';`. Se suman los dos, como en `2026-11-09-profile-editable.sql` (sin el `notify`, PostgREST no ve la tabla nueva hasta reiniciar). La corre Pablo; nadie corre SQL contra Supabase desde el agente.
3. **Test del envío masivo.** El spec lo pone en `message-triggers.service.test.js`, pero ese archivo **mockea `notify.service.js` entero**: ahí el filtro no corre y el test no probaría nada. Se usa el `notify.service` real (con `notify.setup.js`, que mockea repos y FCM) y el `message-triggers.service` real: el existente pasa a `message-triggers.service/message-triggers.test.js` (`git mv`) y el caso nuevo va en `message-triggers.service/broadcast-preferences.test.js`.
4. **Qué se mockea en los tests de `notify`.** Se mockea `repositories/notifications/preferences.repository.js`, no el service: así el test ejercita el `isPushAllowed` real y el `catch` de la decisión 5. `notify.setup.js` suma ese mock (si no, el service real importaría `config/supabase.js`).
5. **`components/shared/ui/` ya tiene 10 archivos** (Avatar, BrandMark, Button, Card, Dialog, Input, Pill, Select, Stat, Textarea): `Switch.jsx` sería el 11.º y rompe la Regla 2. Va en `components/shared/forms/Switch.jsx` (carpeta hermana de `layout/`, `states/`, `ui/`), test en `tests/components/shared/forms/Switch.test.jsx`. No se mueven los otros controles (tocaría decenas de imports de PRs abiertas).
6. **`AccountCard` es compartida** entre Mi perfil (alumno) y `TrainerAccountPage` (PT). Las preferencias son solo del alumno (el PT recibiría 403): la fila se muestra solo con `user.role === 'student'` leído de `useAuthStore`, dentro de `AccountCard` (el spec dice que no se toca `MyProfilePage.jsx`). Son +4 líneas en vez de +2. Sin esto, la página del PT haría un GET que da 403.
7. **`stubSelf`** (`frontend/tests/helpers/students/self.jsx`) devuelve 500 a todo pedido sin handler: con la fila nueva, los tests existentes de Mi perfil verían "No pudimos cargar tus preferencias". Se le suma `preferences` (default: los cinco en `true`, `updated_at: null`) y, opcional, `savePreferences(init)`.
8. **Trainer en `isPushAllowed`.** El spec dice "trainer → `true`". Además de ahorrar la lectura, es necesario: los ids pueden repetirse entre `trainers` y `students` (lo dice `push-tokens.repository.js`), y leer `notification_preferences` con el id de un PT podría aplicarle las preferencias de un alumno.
9. **Campos de más en el `PUT`.** "Se ignoran": la validación devuelve solo los cinco, y el service usa `user.id` como dueño (un `student_id` en el body no llega al upsert).
10. **`/preferences` antes de `/:id/read`.** Hoy no hay `GET /:id`, así que no colisionan; igual se respetan el orden del spec y su test.
11. Conteos: `notify.service.js` 67, `notifications.routes.js` 24, `notifications.validation.js` 55, `07-rls.sql` 33, `AccountCard.jsx` 57, `stubSelf` (`self.jsx`) 78, `notify.service.test.js` 118, `message-triggers.service.test.js` 111. Ninguno pasa de 200.
12. Si entra la **#92** antes, sumar `GET/PUT /notifications/preferences` a su tabla de aislamiento en `auditoria-seguridad.md`. `schema/README.md` y `schema-checks.sql` también los toca la **#83**: agregar al final de cada lista.

## Global Constraints

- Ningún archivo de código pasa de **200 líneas** (tests y `.sql` incluidos); carpetas de hasta 10 archivos; los tests copian el árbol de `src`.
- Commits Conventional en español, **sin** `Co-Authored-By` ni "Generated with". Nunca `--no-verify`. No se commitean `.agents/`, `.claude/`, `skills-lock.json`.
- Tipos y orden (pantalla, modelo, body): `message`, `comment`, `appointment`, `pr`, `achievement`. Default `true`.
- Tabla `notification_preferences`: `student_id uuid primary key references students (id) on delete cascade`, cinco `boolean not null default true`, `updated_at timestamptz not null default now()`; RLS activado sin políticas; sin índice extra.
- `GET /notifications/preferences` y `PUT /notifications/preferences`: `requireRole('student')`; respuesta `200 { data: { message, comment, appointment, pr, achievement, updated_at } }`; sin fila → todo `true` y `updated_at: null`. `PUT`: 400 `VALIDATION_ERROR` si falta alguno o no es booleano (detalle por campo).
- Push apagado: no sale, la fila de `notifications` se guarda, `push_sent_at` queda `null`. Lectura que falla: no sale, se loguea `[notifications] push`, no lanza.
- No tocar: `triggers.service.js` (#76), `message-triggers.service.js`, `push-policy.js`, `MyProfilePage.jsx`, `app.js`, `errors.js`.
- Copys web: "Notificaciones", "Editar", "Todas activadas", "N de 5 activadas", "Todas apagadas", "Cargando…", "No pudimos cargar tus preferencias", "Reintentar", "Avisos en tu celular", "Elegí qué te avisamos con una notificación. Lo apagado igual queda en la app.", "Guardar", "Cancelar", y los cinco títulos/detalles del spec (Mensajes — "Cuando tu entrenador/a te escribe"; Comentarios — "Cuando comenta una de tus sesiones"; Turnos — "Cuando confirma, cancela o te agenda un turno"; Récords — "Cuando superás una marca personal"; Logros — "Cuando desbloqueás un logro").
- Caché web: `['notifications', 'preferences']`.

## Review Focus

1. **Falla la lectura de preferencias** → el push no sale, `notify` devuelve la fila guardada con `push_sent_at: null`, nada lanza (ni en `pushOnly`). Test en Task 5.
2. **Alumno que nunca entró a la pantalla (sin fila)** → recibe todo como hoy; `GET` devuelve todo `true` con `updated_at: null`. Test en Tasks 3 y 5.
3. **`PUT` con body parcial (`{ message: false }`), con `"false"` string o con `student_id` de otro** → 400 sin upsert en los dos primeros; en el tercero se ignora el campo y el upsert va con `user.id`. Test en Tasks 3 y 4.
4. **PT cuyo id coincide con el de un alumno que apagó `message`** → el PT igual recibe el push del chat (no se leen preferencias para `trainer`). Test en Task 3.
5. **Guardar falla en el diálogo** → `role="alert"` adentro, el diálogo sigue abierto con los cambios del usuario; Cancelar y volver a abrir muestra lo del servidor. Test en Task 8.

---

## Backend

Comandos (desde `C:\ft-gx3x`):
- Tests: `cd backend && npx cross-env TZ=UTC node --experimental-vm-modules node_modules/jest/bin/jest.js <path>`
- Lint (incluye el chequeo de 200 líneas): `cd backend && npm run lint`

### Task 1: Migración, schema y modelo de preferencias

**Files:**
- Create: `backend/src/database/migrations/2026-11/2026-11-09-notification-preferences.sql`, `backend/src/models/notifications/preferences.js`
- Modify: `backend/src/database/schema/06-ai-and-agenda.sql` (bloque `notification_preferences` al final, después de `push_tokens`), `backend/src/database/schema/07-rls.sql` (+1 línea), `backend/src/database/schema/README.md` (`notification_preferences` en la fila de `06-ai-and-agenda.sql`), `backend/src/database/checks/schema-checks.sql` (`('notification_preferences')` al final de `expected`)
- Test: `backend/tests/unit/models/notifications/preferences.test.js`

**Interfaces:**
- Produces (`models/notifications/preferences.js`):
  - `PREFERENCES_TABLE = 'notification_preferences'`
  - `PREFERENCE_TYPES = ['message', 'comment', 'appointment', 'pr', 'achievement']`
  - `PREFERENCE_COLUMNS = 'message, comment, appointment, pr, achievement, updated_at'`
  - `DEFAULT_PREFERENCES` (congelado, los cinco en `true`)
  - `toPreferences(row) => { message, comment, appointment, pr, achievement, updated_at }`: `null`/`undefined` → defaults con `updated_at: null`; con fila, solo esos seis campos (sin `student_id`).
  - `allowsPush(prefs, type) => boolean`: tipo fuera de `PREFERENCE_TYPES` → `true`; si no, `prefs[type] !== false`.

- [ ] **Step 1: Tests que fallan:** `toPreferences(null)` y `toPreferences(undefined)` → los cinco `true` y `updated_at: null`; `toPreferences({ student_id: 's', message: false, …, updated_at: 'X' })` no trae `student_id` y conserva `message: false`; `PREFERENCE_TYPES` es exactamente el array de arriba; `allowsPush` con `comment: false` → `false`, con `comment: true` → `true`, con `'inactivity'` y `undefined` → `true`.
- [ ] **Step 2: Correr** `…jest.js tests/unit/models/notifications/preferences.test.js` → FAIL (módulo inexistente).
- [ ] **Step 3: Migración y schema.** SQL exacto de la migración (lo corre Pablo en el SQL Editor de Supabase dev):

```sql
-- ============================================================================
-- GX3 · Preferencias de notificación del alumno. Re-ejecutable.
-- Correr en el SQL Editor de Supabase. También está en database/schema/
-- (06-ai-and-agenda.sql y 07-rls.sql).
-- ============================================================================

-- Una fila por alumno, una columna por tipo. Sin fila = todo prendido.
-- Solo decide el push: la fila de notifications se guarda igual.
create table if not exists notification_preferences (
  student_id  uuid primary key references students (id) on delete cascade,
  message     boolean not null default true,
  comment     boolean not null default true,
  appointment boolean not null default true,
  pr          boolean not null default true,
  achievement boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table notification_preferences enable row level security;

notify pgrst, 'reload schema';
```

  En `06-ai-and-agenda.sql`: bloque `-- ── notification_preferences (GX3)` al final con el mismo `create table` (sin `alter … rls` ni `notify`: el RLS va en `07-rls.sql`) y la tabla sumada al encabezado del archivo. Se descartó un `06c-notification-preferences.sql` aparte: entra en el 06, que ya tiene `notifications` y `push_tokens`.
- [ ] **Step 4: Implementar el modelo.** Correr el test → PASS; `npm run lint` → OK.
- [ ] **Step 5: Pasarle a Pablo** el SQL y la comprobación: `select * from notification_preferences limit 1;` (0 filas, sin error) y `schema-checks.sql` → 0 filas.
- [ ] **Step 6: Commit** `feat(db): tabla notification_preferences y modelo de preferencias (GX3)`

### Task 2: Repositorio de preferencias

**Files:**
- Create: `backend/src/repositories/notifications/preferences.repository.js`
- Test: `backend/tests/unit/repositories/notifications/preferences.repository.test.js` (mock encadenable de `config/supabase.js` como `push-tokens.repository.test.js`, sumando `maybeSingle` y `single`)

**Interfaces:**
- Consumes: `PREFERENCES_TABLE`, `PREFERENCE_COLUMNS` (Task 1); `unwrap`.
- Produces: `findByStudent(studentId) => Promise<row|null>` (`select(PREFERENCE_COLUMNS).eq('student_id', id).maybeSingle()`); `upsert(studentId, prefs, now) => Promise<row>` (`upsert({ student_id, ...prefs, updated_at: now }, { onConflict: 'student_id' }).select(PREFERENCE_COLUMNS).single()`). Error de Supabase → `Errors.internal` (500).

- [ ] **Step 1: Tests que fallan:** `from('notification_preferences')`; `findByStudent('s-1')` filtra `eq('student_id', 's-1')`, usa `maybeSingle` y devuelve `null` sin fila; `upsert('s-1', { message: false, …}, 'NOW')` llama con `{ student_id: 's-1', message: false, …, updated_at: 'NOW' }` y `{ onConflict: 'student_id' }` y devuelve la fila; error → rechaza con `statusCode: 500`.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr** → PASS; lint.
- [ ] **Step 5: Commit** `feat(notifications): repositorio de preferencias de notificación`

### Task 3: Service de preferencias

**Files:**
- Create: `backend/src/services/notifications/preferences.service.js`
- Test: `backend/tests/unit/services/notifications/preferences.service.test.js` (mock del repo de Task 2)

**Interfaces:**
- Consumes: repo (Task 2), `toPreferences`, `allowsPush`, `PREFERENCE_TYPES` (Task 1), `Errors.forbidden`.
- Produces:
  - `get(user) => Promise<prefs>`; `replace(user, body) => Promise<prefs>` (upsert con `user.id`, solo los cinco tipos de `body`, `now` = `new Date().toISOString()`). Ambos: `user.role !== 'student'` → `Errors.forbidden('Solo el alumno tiene preferencias de notificación')` sin tocar el repo.
  - `isPushAllowed(userId, userRole, type) => Promise<boolean>`: `userRole !== 'student'` → `true` sin leer (Nota 8); alumno → `allowsPush(toPreferences(await findByStudent(userId)), type)`. Si la lectura falla, **lanza** (el `catch` está en `notify`).

- [ ] **Step 1: Tests que fallan:** `get` sin fila → los cinco `true`, `updated_at: null`; `get` con fila → la fila mapeada; `replace(student, { ...cinco, student_id: 'otro', extra: 1 })` → upsert con `('st-1', { message, comment, appointment, pr, achievement }, ISO)` (Review Focus 3) y devuelve `toPreferences` de lo que devolvió el repo; `get`/`replace` con trainer → 403 y el repo no se llama; `isPushAllowed('tr-1', 'trainer', 'message')` → `true` sin llamar `findByStudent` (Review Focus 4); alumno con `comment: false` → `false` para `comment`, `true` para `pr`; sin fila → `true`; repo rechaza → `isPushAllowed` rechaza.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr** → PASS; lint.
- [ ] **Step 5: Commit** `feat(notifications): service de preferencias (leer, reemplazar y si corresponde el push)`

### Task 4: Validación, controller y rutas `GET/PUT /notifications/preferences`

**Files:**
- Create: `backend/src/controllers/notifications/preferences.controller.js`
- Modify: `backend/src/validations/notifications/notifications.validation.js` (+`validatePreferences`), `backend/src/routes/notifications/notifications.routes.js`
- Test: `backend/tests/unit/validations/notifications/notifications.validation.test.js`, `backend/tests/unit/routes/notifications/notifications.routes.test.js`

**Interfaces:**
- Consumes: `get`, `replace` (Task 3); `PREFERENCE_TYPES` (Task 1).
- Produces:
  - `validatePreferences(body) => { message, comment, appointment, pr, achievement }`: por cada tipo que no es booleano (falta, `null`, `"false"`) un detalle `{ field: tipo, message: '<tipo> debe ser true o false' }`; todos juntos en un solo `VALIDATION_ERROR`; campos de más no salen. `body` no objeto → los cinco detalles.
  - Controller: `getPreferences` → `res.json({ data: await service.get(req.user) })`; `replacePreferences` → `res.json({ data: await service.replace(req.user, req.body) })` (los dos con `asyncHandler`, 200).
  - Rutas: `const studentOnly = [authenticate, requireRole('student')]`; `router.get('/preferences', ...studentOnly, preferences.getPreferences)` y `router.put('/preferences', ...studentOnly, validate(validatePreferences), preferences.replacePreferences)`, **antes** de `/read-all` y `/:id/read`.

- [ ] **Step 1: Tests que fallan:**
  - validación: los cinco booleanos pasan y devuelve solo esos cinco (con `student_id` de más, no sale); sin `pr` → detalle en `pr`; `message: 'false'` → detalle en `message`; `{}` → cinco detalles; `null` como body → cinco detalles.
  - rutas: `/preferences` `get` y `put` definidas; `handlers[0] === authenticate`; `requireRole`: `student` pasa, `trainer` y `admin` → 403; `put` tiene 4 handlers y `get` 3; `indexOf('/preferences') < indexOf('/:id/read')`. El `describe.each` existente no cambia.
- [ ] **Step 2: Correr** `tests/unit/validations/notifications tests/unit/routes/notifications` → FAIL.
- [ ] **Step 3: Implementar** (validación, controller y rutas).
- [ ] **Step 4: Correr** esos dos y `tests/unit/app` (barrido de validación: el `PUT` pasa por `validate`, no hace falta tocar `WITHOUT_BODY`) → PASS; lint.
- [ ] **Step 5: Commit** `feat(notifications): GET y PUT /notifications/preferences para el alumno`

### Task 5: Filtro del push en `notify.service` (y envío masivo)

**Files:**
- Modify: `backend/src/services/notifications/notify.service.js` (`pushToUser`, +3), `backend/tests/helpers/notifications/notify.setup.js` (mock del repo de preferencias)
- Move: `backend/tests/unit/services/notifications/notify.service.test.js` → `…/notify.service/notify.test.js`; `…/message-triggers.service.test.js` → `…/message-triggers.service/message-triggers.test.js` (`git mv`, imports relativos un nivel más)
- Create: `backend/tests/unit/services/notifications/notify.service/preferences.test.js`, `backend/tests/unit/services/notifications/message-triggers.service/broadcast-preferences.test.js`

**Interfaces:**
- Consumes: `isPushAllowed` (Task 3).
- Produces: `pushToUser` empieza con `if (!(await isPushAllowed(userId, userRole, payload.data?.type))) return { sent: false, dead: [] };`. `notify` y `pushOnly` no cambian de firma. `notify.setup.js` exporta además `mockPrefs = { findByStudent: jest.fn(), upsert: jest.fn() }` (mock de `repositories/notifications/preferences.repository.js`).

- [ ] **Step 1: Mover los dos tests** con `git mv`, ajustar imports y correrlos → PASS (sin cambios de código todavía, salvo el mock nuevo en el setup).
- [ ] **Step 2: Tests que fallan** (`notify.service/preferences.test.js`, `beforeEach` como el de `notify.test.js` + `mockPrefs.findByStudent.mockResolvedValue(null)`):
  - `comment` apagado: `notify(INPUT)` → `insert` llamado, `sendToToken` y `findTokensForUser` no, `setPushSent` no, devuelve `row` (`push_sent_at: null`); `findByStudent` con `'u-1'`.
  - `pushOnly` con `data: { type: 'message' }` y `message` apagado → no envía. Con `data: { type: 'achievement' }` y `achievement` apagado (resumen de logros) → no envía.
  - `findByStudent` rechaza → `notify` devuelve `row`, no envía, `console.error('[notifications] push', …)`; `pushOnly` resuelve `undefined` y no envía (Review Focus 1).
  - sin fila → envía como hoy y marca `push_sent_at` (Review Focus 2).
  - `userRole: 'trainer'` → no llama `findByStudent` y envía.
- [ ] **Step 3: Test que falla** (`message-triggers.service/broadcast-preferences.test.js`): importa `notify.setup.js` (notify real), mockea `repositories/auth/auth.repository.js` y después importa el `message-triggers.service` real; `findByStudent` devuelve `{ message: false, … }` para `'b'` y `null` para el resto; `onBroadcastSent({ trainerId, studentIds: ['a', 'b', 'c'], body })` → `findTokensForUser` llamado para `'a'` y `'c'`, no para `'b'`; `sendToToken` dos veces.
- [ ] **Step 4: Correr** `tests/unit/services/notifications` → FAIL.
- [ ] **Step 5: Implementar** la línea en `pushToUser` (import de `./preferences.service.js`).
- [ ] **Step 6: Correr** `tests/unit/services/notifications` → PASS; lint.
- [ ] **Step 7: Commit** `feat(notifications): no mandar el push de un tipo que el alumno apagó`
- [ ] **Step 8: Cierre del backend:** `cd backend && npm test` y `npm run lint` → todo verde.

---

## Web

Comandos (desde `C:\ft-gx3x\frontend`): `npx vitest run <path>`, `npm run lint`.

### Task 6: API, utils y hook de preferencias

**Files:**
- Create: `frontend/src/api/notifications/preferences.api.js`, `frontend/src/utils/notifications/preferences.js`, `frontend/src/hooks/notifications/useNotificationPrefs.js`
- Test: `frontend/tests/api/notifications/preferences.api.test.js`, `frontend/tests/utils/notifications/preferences.test.js`, `frontend/tests/hooks/notifications/useNotificationPrefs.test.jsx`

**Interfaces:**
- Produces:
  - api: `getPreferences() => data` (`request('/notifications/preferences')`, devuelve `res.data`); `savePreferences(prefs) => data` (`PUT` con los cinco).
  - utils: `PREFERENCE_ITEMS = [{ type, title, detail }]` en el orden y con los textos de Global Constraints; `summary(prefs) => 'Todas activadas' | 'N de 5 activadas' | 'Todas apagadas'`; `pickPreferences(prefs)` → solo los cinco.
  - hook: `PREFERENCES_KEY = ['notifications', 'preferences']`; `useNotificationPrefs({ enabled = true } = {}) => { query, save, isSaving }`; `save(prefs)` hace el `PUT`, deja la respuesta con `setQueryData(PREFERENCES_KEY, data)` y tira el `ApiError` si falla.

- [ ] **Step 1: Tests que fallan:** api con `fetchMock` (método, URL, body con los cinco); `summary` con 5, 3, 1 y 0 en `true` → "Todas activadas", "3 de 5 activadas", "1 de 5 activadas", "Todas apagadas"; `PREFERENCE_ITEMS.map((i) => i.type)` en orden; hook: `save` actualiza la caché, error → rechaza.
- [ ] **Step 2: Correr** → FAIL. **Step 3: Implementar.** **Step 4: Correr** → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): api, hook y textos de las preferencias de notificación`

### Task 7: `Switch`

**Files:**
- Create: `frontend/src/components/shared/forms/Switch.jsx` (Nota 5)
- Test: `frontend/tests/components/shared/forms/Switch.test.jsx`

**Interfaces:**
- Produces: `<Switch checked onChange={(next) => …} label detail disabled id />`: `<button type="button" role="switch" aria-checked={checked}>` con el `label` como nombre accesible (y `detail` como `aria-describedby`); click y espacio llaman `onChange(!checked)`; `disabled` no llama.

- [ ] **Step 1: Tests que fallan:** rol `switch` con nombre "Mensajes"; `aria-checked` refleja `checked`; click → `onChange(false)` desde `true`; foco + espacio → `onChange`; `disabled` → no.
- [ ] **Step 2–4:** FAIL → implementar (tokens del tema: `bg-accent` prendido, `bg-ink3` apagado) → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): interruptor accesible (Switch)`

### Task 8: `NotificationPrefsDialog`

**Files:**
- Create: `frontend/src/components/account/NotificationPrefsDialog.jsx`
- Test: `frontend/tests/components/account/NotificationPrefsDialog.test.jsx`

**Interfaces:**
- Consumes: `Dialog`, `Button`, `Switch`, `PREFERENCE_ITEMS`, `pickPreferences`, `useNotificationPrefs` (Task 6).
- Produces: `<NotificationPrefsDialog open onClose initial />`: `initial` son las preferencias del GET; al abrir copia `initial` a un estado local (Cancelar y reabrir vuelve a lo del servidor); "Guardar" deshabilitado si nada cambió, `loading` mientras guarda; éxito → `onClose()`; error → `<p role="alert">No pudimos guardar tus preferencias</p>` adentro, sin cerrar.

- [ ] **Step 1: Tests que fallan:** título "Avisos en tu celular" y la aclaración; cinco switches con el estado de `initial`; "Guardar" deshabilitado al abrir; cambiar "Comentarios" lo habilita y el `PUT` lleva los cinco con `comment: false`; éxito cierra; 500 → alert dentro del diálogo, diálogo abierto y "Comentarios" sigue apagado; Cancelar y reabrir → vuelve a `initial` (Review Focus 5).
- [ ] **Step 2–4:** FAIL → implementar → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): diálogo de preferencias de notificación`

### Task 9: Fila "Notificaciones" en la tarjeta "Cuenta" (solo alumno)

**Files:**
- Create: `frontend/src/components/account/NotificationsRow.jsx`, `frontend/tests/pages/student/MyProfilePage/notifications.test.jsx`
- Modify: `frontend/src/components/account/AccountCard.jsx` (Nota 6), `frontend/tests/helpers/students/self.jsx` (`stubSelf({ preferences, savePreferences })`, Nota 7)

**Interfaces:**
- Consumes: `AccountRow`, `useNotificationPrefs`, `summary`, `NotificationPrefsDialog`.
- Produces: `<NotificationsRow />` entre "Contraseña" y el export: `AccountRow` con título "Notificaciones", subtítulo `summary(data)` / "Cargando…" / "No pudimos cargar tus preferencias", acción "Editar" (con error: "Reintentar", que hace `refetch`). `AccountCard` la renderiza solo si `useAuthStore((s) => s.user?.role) === 'student'`.

- [ ] **Step 1: Tests que fallan** (página real con `stubSelf`): fila con "Todas activadas" sin fila guardada; con `comment: false` → "4 de 5 activadas"; GET que falla → texto de error y "Reintentar" que vuelve a pedir y muestra el resumen; "Editar" abre el diálogo, guardar actualiza el resumen sin recargar. En `TrainerAccountPage` (test existente del PT): no aparece "Notificaciones" ni hay pedido a `/notifications/preferences`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. Correr `npx vitest run` completo (los de Mi perfil existentes siguen verdes con el default de `stubSelf`); lint.
- [ ] **Step 5: Commit** `feat(web): fila Notificaciones en la tarjeta Cuenta del alumno`

---

## Docs y verificación

### Task 10: Contrato, modelo, auditoría y prueba en el navegador

**Files:**
- Modify: `docs/arquitectura/contratos-api.md` (sección "Módulo: Notificaciones": `GET` y `PUT /notifications/preferences` con ejemplos, 400/403, y una línea en el módulo: "un tipo apagado no manda push; la fila se guarda igual"), `docs/arquitectura/modelo-de-datos.md` (tabla `notification_preferences`), `docs/proceso/auditoria-seguridad.md` (23 → 24 tablas con RLS en las filas 2 y la del chequeo en vivo; si ya entró la #92, las 2 rutas en su tabla)
- Create: `docs/superpowers/specs/assets/gx3/01-fila-notificaciones.jpg`, `02-dialogo.jpg`, `03-guardado.jpg`, `04-angosto-375.jpg`, `05-bandeja-celular-sin-push.jpg`

- [ ] **Step 1:** Docs. Commit `docs(api): contrato y modelo de las preferencias de notificación (GX3)`.
- [ ] **Step 2: Navegador** (con la migración corrida por Pablo): alumno de QA en Mi perfil → fila "Todas activadas" (01) → "Editar", apagar "Comentarios" (02) → guardar, fila "4 de 5 activadas" y persiste al recargar (03) → ancho 375 px (04). Con el celular de prueba: el PT comenta una sesión → no llega push pero aparece en la bandeja (05); prender "Comentarios" y comentar otra → llega.
- [ ] **Step 3:** Commit `docs(notifications): capturas de la GX3`.
- [ ] **Step 4: Cierre:** `npm test` y `npm run lint` en `backend` y `frontend`; `git merge origin/develop` antes de abrir la PR (apunta a `feature/profile-editable-gx2`).
