# GX1 · Cuenta: cambiar contraseña, blanqueo y exportar CSV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que alumno y PT cambien su contraseña, que el PT blanquee la del alumno con una clave temporal que obliga a cambiarla (bloqueo en el backend), y que se exporten las sesiones en un CSV que abre bien en Excel en español.

**Architecture:** backend en capas (route → controller → service → repository → model): un claim `must_change_password` en el access token que `authenticate` rechaza con `403 PASSWORD_CHANGE_REQUIRED`; `password.service` para cambio y blanqueo; un módulo `export` (modelo CSV puro + repo paginado + service). Web: `api/account`, hooks, `AccountCard` en Mi perfil y en `/pt/cuenta`, guard que manda a `/cambiar-clave`, y la sección de blanqueo dentro de `EditStudentDialog`.

**Tech Stack:** Express + Supabase (service_role) + bcryptjs + jsonwebtoken + express-rate-limit; Jest ESM (`jest.unstable_mockModule`). React + react-router + zustand + TanStack Query; Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-09-gx1-cuenta-contrasena-design.md` (manda sobre este plan; CONTRIBUTING manda sobre los dos).

## Notas (spec vs. código real)

1. **Rama.** El spec sugiere `feature/account-password`; se trabaja en `feature/account-settings-gx1` (worktree `C:\ft-gx1x`, sale de la rama de la #89 + specs GX). Antes de abrir la PR: `git merge origin/develop` (con #84, #85 y #89 adentro). Si la #89 no entró, la PR apunta a `feature/student-context-cards`.
2. **Nombres de módulo (Regla 2 de CONTRIBUTING).** `export` (backend) y `account` (web) no son recursos de la API. Lo más cercano al spec: se conservan y se suman a "Excepciones de nombre" de CONTRIBUTING (Task 19), igual que `gamification`/`agenda`/`student`/`workout`; se avisa en la PR para que Igna lo confirme.
3. **Barrido de rutas** (`backend/tests/unit/app/validation-coverage.test.js`): exige que la lista de rutas limitadas sea exacta y que el limitador sea `handlers[0]`. Las 4 rutas nuevas llevan `limitRate(...)` **primero** (antes de `authenticate`) y se suman a la lista. `POST /students/:id/password-reset` no tiene body → va a `WITHOUT_BODY` con su motivo. El spec no lo menciona.
4. **`checkPassword`** de `auth.validation.js` escribe siempre en el campo `password`; para `new_password` pasa a aceptar `{ field = 'password' }` (además de exportarse).
5. **Columnas de la ficha.** El login del alumno lee `STUDENT_DETAIL_COLUMNS` y el refresh usa `findStudentById` (mismas columnas): `must_change_password` y `password_changed_at` se suman ahí, así que también salen en `GET/PATCH /students/:id`. Se documenta en el contrato.
6. **Embeds de Supabase.** `session_sets` tiene dos FK a `exercises` (`exercise_id`, `original_exercise_id`): el embed necesita el hint (`exercise:exercises!session_sets_exercise_id_fkey(name)`, `original:exercises!session_sets_original_exercise_id_fkey(name)`). Ningún repo del proyecto usa embeds todavía (el historial resuelve nombres a mano); se respeta el spec y se verifica el nombre real de las FK en Supabase dev antes de dar la Task 9 por terminada.
7. **Sin toast en la web** (`components/shared/ui` no tiene): el "Listo. Cerramos tu sesión en los otros dispositivos." es un aviso `role="status"` en la tarjeta.
8. **`/cambiar-clave`** necesita sesión pero no shell ni rol: guard nuevo `RequirePasswordChange` en `guards.jsx` (sin sesión → `/login`; sin el flag → home del rol).
9. **`tests/routes/guards.test.jsx`** ya existe (127 líneas). Para poner `guards/must-change.test.jsx` como pide el spec sin dejar archivo y carpeta con el mismo nombre, se mueve a `tests/routes/guards/roles.test.jsx` (`git mv`, sin cambios).
10. **La web no tiene push token:** el cambio desde la web no manda `push_token` y borra todos los push tokens del usuario (los del celular incluidos). Es lo que dice la decisión 1 ("salvo el de este dispositivo").
11. **`docs/proceso/auditoria-seguridad.md` ya está en la rama** (sin tabla de rutas: el rate limit está en la fila 6). Se suman los limitadores nuevos a esa fila.
12. **404 vs. 403 para un alumno ajeno.** Las Pruebas del spec dicen "ajeno 404" (export) y "404/403" (reset), pero `assertCanAccessStudent` devuelve **403** para ajeno o inexistente (no revela qué ids existen) y el spec manda usarlo. Se mantiene el 403; el contrato lo documenta así.
13. Conteos menores: `password.js` tiene 13 líneas y `MyProfilePage.jsx` 53 (el spec dice 14 y 52). Sin efecto.

## Global Constraints

- Ningún archivo de código pasa de **200 líneas**, tests incluidos; carpetas de hasta **10 archivos**; los tests copian el árbol de `src`.
- Commits Conventional en español, **sin** `Co-Authored-By` ni "Generated with".
- Reglas de clave: **≥ 8, una mayúscula, un número**; la nueva ≠ la actual.
- Clave temporal: **10 caracteres**, alfabeto sin `0 O 1 l I`, al menos una mayúscula y un número, `crypto.randomInt`; solo se guarda el hash (bcrypt 10 rondas).
- `403 PASSWORD_CHANGE_REQUIRED` en todo endpoint autenticado salvo `PUT /auth/password` (y `POST /auth/logout`, que no usa `authenticate`).
- Clave actual incorrecta → **`400 VALIDATION_ERROR`, campo `current_password`** (nunca 401).
- Rate limit: `passwordChange`, `passwordReset`, `export`, cada uno con cupo `limits.auth` (30 por IP); sin variables de entorno nuevas.
- CSV: `text/csv; charset=utf-8`, **BOM**, separador **`;`**, decimales con **coma**, fin de línea **CRLF**; celdas de texto que empiezan con `= + - @` o tab llevan `'` adelante.
- Columnas alumno: `Fecha;Hora;Duración (min);Rutina;Ejercicio;Ejercicio planificado;Serie;Reps;Kg;Completada;Descanso (s);RPE;Notas;Comentario del PT`. PT: `Alumno;Email;Activo;` + las anteriores, con los dados de baja. Fecha y hora en Argentina.
- Archivos: `fittrainer-mis-sesiones-AAAA-MM-DD.csv` (alumno), `fittrainer-alumnos-AAAA-MM-DD.csv` (PT, todos), `fittrainer-<nombre>-AAAA-MM-DD.csv` (PT, un alumno).
- No tocar `app.js`, `env.js`, `ProfileActions.jsx`, `StudentProfilePage.jsx`, `triggers.service.js`. Lo nuevo de `errors.js` va **después de `accountDisabled`**.
- Copys: "Contraseña", "Modificada hace N días|meses", "Nunca la cambiaste", "Cambiar", "Exportar mis datos", "Historial completo en formato CSV", "Descargar", "Exportar los datos de tus alumnos", "Todas sus sesiones en CSV", "Tu cuenta" · "CONTRASEÑA Y DATOS", "Configuración", "Tu entrenador/a te dio una clave temporal. Elegí una nueva para seguir.", "Listo. Cerramos tu sesión en los otros dispositivos.", "Acceso a la app", "Blanquear clave", "Se cierra su sesión en todos sus dispositivos", "Copiar", "Se muestra una sola vez. Al entrar, tendrá que elegir una nueva."

## Review Focus

1. **Nombre del alumno con acentos o espacios en el archivo del PT** (`Martín Pérez`): el `Content-Disposition` tiene que ser ASCII → slug `martin-perez`. Test en Task 10.
2. **`refresh_token` vencido, revocado o de otro usuario en `PUT /auth/password`** → 400 en `refresh_token`, sin cambiar la clave. Test en Task 6.
3. **Sesión en curso o sin `finished_at`** en el CSV → "Duración (min)" vacía, el resto de la fila igual. Test en Task 8.
4. **Recarga de la página con el flag puesto** (usuario guardado en localStorage): `restore()` tiene que leer `must_change_password` del refresh y el guard mandar a `/cambiar-clave` sin que salga ningún otro pedido. Test en Task 13 y Task 17.
5. **Doble clic en "Blanquear clave"** o error de red a mitad: no se generan dos claves ni se muestra una vieja; con error, el mensaje y el botón vuelven. Test en Task 18.

---

## Backend

Comandos (desde `C:\ft-gx1x`):
- Tests: `cd backend && npx cross-env TZ=UTC node --experimental-vm-modules node_modules/jest/bin/jest.js <path>`
- Lint (incluye el chequeo de 200 líneas): `cd backend && npm run lint`

### Task 1: Migración, schema y columnas de los modelos

**Files:**
- Create: `backend/src/database/migrations/2026-11/09-15/2026-11-09-account-password.sql`
- Modify: `backend/src/database/schema/01-auth.sql`, `backend/src/database/schema/02-students.sql`, `backend/src/models/students/student.model.js:25-26`, `backend/src/models/auth/trainer.model.js:11`
- Test: `backend/tests/unit/models/students/` y `backend/tests/unit/models/auth/` (sumar casos al test existente del modelo; si no hay, `student.model.test.js` / `trainer.model.test.js`)

**Interfaces:**
- Produces: `STUDENT_DETAIL_COLUMNS` incluye `must_change_password, password_changed_at`; `TRAINER_PUBLIC_COLUMNS` incluye `password_changed_at`.

- [ ] **Step 1: Test que falla** — `STUDENT_DETAIL_COLUMNS` contiene `must_change_password` y `password_changed_at`; `TRAINER_PUBLIC_COLUMNS` contiene `password_changed_at`; ninguna contiene `password_hash`; `STUDENT_LIST_COLUMNS` no cambia.
- [ ] **Step 2: Correr y ver que falla** — `…jest.js tests/unit/models` → FAIL.
- [ ] **Step 3: Migración re-ejecutable** (encabezado como `2026-11-01-session-sets-rest.sql`): `alter table students add column if not exists must_change_password boolean not null default false; alter table students add column if not exists password_changed_at timestamptz; alter table trainers add column if not exists password_changed_at timestamptz;`. Las mismas columnas en el `create table` de `01-auth.sql` (trainers) y `02-students.sql` (students), con un comentario de una línea ("GX1: blanqueo y 'Modificada hace…'").
- [ ] **Step 4: Columnas en los modelos** y correr `tests/unit/models` → PASS; `npm run lint` → OK.
- [ ] **Step 5: Aplicar la migración en Supabase dev** (SQL Editor o MCP) y comprobar con `select must_change_password, password_changed_at from students limit 1`.
- [ ] **Step 6: Commit** `feat(db): must_change_password y password_changed_at en students y trainers (GX1)`

### Task 2: Error, claim y middleware de cambio obligatorio

**Files:**
- Modify: `backend/src/shared/utils/errors.js` (después de `accountDisabled`), `backend/src/shared/utils/jwt.js`, `backend/src/shared/middlewares/auth.middleware.js`
- Test: `backend/tests/unit/shared/middlewares/auth.middleware/must-change-password.test.js`

**Interfaces:**
- Produces: `Errors.passwordChangeRequired()` → `AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Tenés que elegir una contraseña nueva para seguir')`; `MUST_CHANGE_CLAIM = 'must_change_password'` (jwt.js); `buildAuthenticate({ allowPasswordChange = false }) => (req, res, next)`; `authenticate = buildAuthenticate()`; `authenticateForPasswordChange = buildAuthenticate({ allowPasswordChange: true })`. `req.user` sigue siendo `{ id, role, email }`.

- [ ] **Step 1: Tests que fallan** (token firmado con `signAccessToken`):
  - `authenticate` con `{ sub, role: 'student', email, must_change_password: true }` → `next` recibe `{ statusCode: 403, code: 'PASSWORD_CHANGE_REQUIRED' }`.
  - `authenticateForPasswordChange` con el mismo token → `next()` sin error y `req.user` = `{ id, role, email }`.
  - sin claim, los dos → `next()`; sin header → 401 `UNAUTHORIZED`; token inválido → 401 (igual que hoy).
  - `authenticate` sigue siendo la misma referencia en cada import (los tests de rutas comparan con `toBe`).
- [ ] **Step 2: Correr** → FAIL (`authenticateForPasswordChange` no existe).
- [ ] **Step 3: Implementar** las tres piezas de Interfaces. La verificación del token y los 401 no cambian.
- [ ] **Step 4: Correr** el test nuevo y `tests/unit/routes` → PASS; `npm run lint`.
- [ ] **Step 5: Commit** `feat(auth): 403 PASSWORD_CHANGE_REQUIRED con el claim must_change_password`

### Task 3: Login y refresh informan y firman el flag

**Files:**
- Modify: `backend/src/services/auth/auth.service.js` (`issueTokens`, `authenticateUser`, `refresh`)
- Test: `backend/tests/unit/services/auth/auth.service/must-change.test.js` (usa `tests/helpers/auth/auth-service.setup.js`)

**Interfaces:**
- Consumes: `MUST_CHANGE_CLAIM` (Task 2), columnas (Task 1).
- Produces: `issueTokens(user, role)` firma `must_change_password: true` solo si `user.must_change_password === true`; login → `user.must_change_password` (boolean, `false` para el PT) y `user.password_changed_at`; refresh → `{ token, expires_in, must_change_password }`.

- [ ] **Step 1: Tests que fallan:**
  - login de alumno con fila `must_change_password: true` → `result.user.must_change_password === true` y `verifyAccessToken(result.token).must_change_password === true`.
  - login de alumno con `false` → el token **no** tiene la propiedad.
  - login de trainer → `user.must_change_password === false`, `user.password_changed_at` presente (null o fecha).
  - refresh de alumno con `findStudentById` → `{ must_change_password: true }` → cuerpo con `must_change_password: true` y claim en el token; de trainer → `must_change_password: false` sin claim.
- [ ] **Step 2: Correr** `tests/unit/services/auth` → FAIL; los tests existentes siguen verdes.
- [ ] **Step 3: Implementar** (≈ +6 líneas; el refresh de alumno ya lee la fila).
- [ ] **Step 4: Correr** `tests/unit/services/auth` → PASS; lint.
- [ ] **Step 5: Commit** `feat(auth): login y refresh informan must_change_password y firman el claim`

### Task 4: Clave temporal y validación del cambio

**Files:**
- Modify: `backend/src/shared/utils/password.js`, `backend/src/validations/auth/auth.validation.js` (`checkPassword` exportada, opción `field`)
- Create: `backend/src/validations/auth/password.validation.js`
- Test: `backend/tests/unit/shared/utils/password.test.js`, `backend/tests/unit/validations/auth/password.validation.test.js`

**Interfaces:**
- Produces: `generateTemporaryPassword() => string`; `TEMP_PASSWORD_ALPHABET` (exportada para el test); `checkPassword(password, details, { full = true, field = 'password' } = {})`; `validateChangePassword(body) => { current_password, new_password, refresh_token, push_token? }`.

- [ ] **Step 1: Tests que fallan:**
  - temporal: largo 10; cada carácter ∈ `TEMP_PASSWORD_ALPHABET`; el alfabeto no contiene ninguno de `0 O 1 l I`; matchea `/[A-Z]/` y `/[0-9]/`; 1000 muestras → `new Set(...).size === 1000`.
  - `validateChangePassword`: `current_password` vacío/no string → detalle en `current_password` ("La contraseña actual es requerida"); `new_password: 'corta'` → detalle en `new_password` (no en `password`); sin mayúscula / sin número → sus mensajes en `new_password`; `refresh_token` faltante → `refresh_token`; `push_token` de 4097 caracteres → `push_token`; válido sin `push_token` → objeto sin esa clave.
- [ ] **Step 2: Correr** ambos → FAIL.
- [ ] **Step 3: Implementar.** Temporal: `crypto.randomInt` sobre el alfabeto, regenerar hasta cumplir mayúscula + número (o forzar una de cada en posición aleatoria). `validateChangePassword` reusa `checkPassword(..., { field: 'new_password' })` y el chequeo de `push_token` de `validateLogout` (extraer `checkPushToken` si hace falta, sin pasar 200 líneas). La regla "igual a la actual" va en el service (necesita el hash).
- [ ] **Step 4: Correr** → PASS; `tests/unit/validations/auth` sin regresiones; lint.
- [ ] **Step 5: Commit** `feat(auth): clave temporal y validación del cambio de contraseña`

### Task 5: Repositorios de credenciales, refresh y push tokens

**Files:**
- Create: `backend/src/repositories/auth/credentials.repository.js`
- Modify: `backend/src/repositories/auth/auth.repository.js` (`revokeAllForUserExcept`), `backend/src/repositories/notifications/push-tokens.repository.js` (`deleteAllForUserExcept`)
- Test: `backend/tests/unit/repositories/auth/credentials.repository.test.js` y casos en los tests de repo existentes (mock de `config/supabase.js` como en los demás tests de repositorio)

**Interfaces:**
- Produces:
  - `findPasswordHash(id, role) => Promise<string|null>` (tabla según rol: `trainers` / `students`).
  - `setPassword(id, role, { hash, mustChange }) => Promise<{ password_changed_at }>`: guarda `password_hash`, `password_changed_at = now`; `must_change_password = mustChange` **solo** en `students` (trainers no tiene la columna).
  - `revokeAllForUserExcept(userId, role, keepTokenHash) => Promise<void>`: como `revokeAllForUser` + `.neq('token_hash', keepTokenHash)`.
  - `deleteAllForUserExcept(user /* {id, role} */, keepToken?) => Promise<void>`: borra por `user_id` + `user_role`; con `keepToken`, `.neq('token', keepToken)`.

- [ ] **Step 1: Tests que fallan:** el query builder recibe la tabla correcta por rol; `setPassword` de trainer no manda `must_change_password`; `revokeAllForUserExcept` filtra `user_id`, `role`, `revoked_at is null` y `neq token_hash`; `deleteAllForUserExcept` sin `keepToken` no llama `neq`; error de Supabase → `INTERNAL_ERROR`.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar** con el estilo de cada archivo (`unwrap` en push-tokens, `if (error) throw Errors.internal` en auth).
- [ ] **Step 4: Correr** → PASS; lint.
- [ ] **Step 5: Commit** `feat(auth): repos de credenciales y revocación de las otras sesiones`

### Task 6: `PUT /auth/password`

**Files:**
- Create: `backend/src/services/auth/password.service.js`, `backend/tests/helpers/auth/password-service.setup.js`
- Modify: `backend/src/shared/middlewares/rate-limit.middleware.js` (`createRateLimiters`: `passwordChange`, `passwordReset`, `export`), `backend/src/controllers/auth/auth.controller.js`, `backend/src/routes/auth/auth.routes.js`, `backend/tests/unit/routes/auth/auth.routes.test.js`, `backend/tests/unit/app/validation-coverage.test.js`
- Test: `backend/tests/unit/services/auth/password.service/change.test.js`

**Interfaces:**
- Consumes: Tasks 2, 4, 5; `findRefreshToken(hash)`, `signAccessToken`, `hashToken`, `env.JWT_EXPIRES_IN`.
- Produces: `changePassword(user, { current_password, new_password, refresh_token, push_token })` → `{ token, expires_in, password_changed_at }`; controller `changePassword` (200); ruta `router.put('/password', limitRate('passwordChange'), authenticateForPasswordChange, validate(validateChangePassword), authController.changePassword)`.

- [ ] **Step 1: Tests del service que fallan** (setup con mocks de credentials, auth y push-tokens repos):
  - actual incorrecta → 400 `VALIDATION_ERROR`, `details[0].field === 'current_password'`, `setPassword` no se llama.
  - nueva igual a la actual → 400 en `new_password` ("La nueva contraseña tiene que ser distinta de la actual").
  - `findRefreshToken` → `null` (revocado/vencido/inexistente) o de otro `user_id`/`role` → 400 en `refresh_token`, sin `setPassword` (Review Focus 2).
  - ok → `setPassword(id, role, { hash, mustChange: false })` con un hash que `verifyPassword(new, hash)` acepta; `revokeAllForUserExcept(id, role, hashToken(refresh_token))`; `deleteAllForUserExcept({ id, role }, push_token)`; el token devuelto verifica sin `must_change_password`; `password_changed_at` es el que devolvió el repo.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar el service.** Orden: validar refresh → verificar actual → comparar con la actual → `setPassword` → revocar los otros → borrar push tokens.
- [ ] **Step 4: Tests de rutas que fallan:** en `auth.routes.test.js`, `PUT /password` arranca con `limitRate` (`handlers[0].rateLimit === 'passwordChange'`), usa `authenticateForPasswordChange` (no `authenticate`) y termina en `authController.changePassword`. En `validation-coverage.test.js`, sumar `['PUT /api/auth/password', 'passwordChange']` a la lista esperada (en el orden en que `listRoutes` las devuelve) y ajustar el nombre del `it` ("los endpoints sensibles…").
- [ ] **Step 5: Implementar** limitadores (`byIp(limits.auth)` cada uno), controller y ruta. Correr `tests/unit/services/auth tests/unit/routes/auth tests/unit/app tests/unit/shared/middlewares` → PASS; lint.
- [ ] **Step 6: Commit** `feat(auth): PUT /auth/password revoca las otras sesiones y devuelve un access nuevo`

### Task 7: `POST /students/:id/password-reset`

**Files:**
- Modify: `backend/src/services/auth/password.service.js`, `backend/src/controllers/students/students.controller.js`, `backend/src/routes/students/students.routes.js`, `backend/tests/unit/routes/students/students.routes.test.js`, `backend/tests/unit/app/validation-coverage.test.js`
- Test: `backend/tests/unit/services/auth/password.service/reset.test.js`

**Interfaces:**
- Consumes: `assertCanAccessStudent(user, id)` (`services/students/student-access.service.js`), `revokeAllForUser`, `setPassword`, `deleteAllForUserExcept`, `generateTemporaryPassword`, `Errors.studentInactive()`.
- Produces: `resetStudentPassword(trainer, studentId) => { temporary_password }`; controller `resetPassword` (200 `{ temporary_password }`); ruta `router.post('/:id/password-reset', limitRate('passwordReset'), authenticate, requireRole('trainer'), validate(validateStudentIdParam, 'params'), studentsController.resetPassword)`.

- [ ] **Step 1: Tests que fallan:**
  - alumno de otro PT o inexistente → 403 (lo que tira `assertCanAccessStudent`; el spec dice 404/403: se respeta el criterio existente, 403); rol `student` → 403.
  - inactivo → 409 `STUDENT_INACTIVE`, nada revocado.
  - orden: `revokeAllForUser(id, 'student')` se llama **antes** que `setPassword` (`mock.invocationCallOrder`).
  - `setPassword(id, 'student', { hash, mustChange: true })`; `deleteAllForUserExcept({ id, role: 'student' })` sin token.
  - la temporal devuelta cumple el formato y `verifyPassword(temporal, hash)`; el hash ≠ temporal (no se guarda en claro).
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar** service, controller y ruta (antes de los `router.use('/:id…')`).
- [ ] **Step 4: Rutas:** test de cadena en `students.routes.test.js`; en `validation-coverage.test.js`, `'POST /api/students/:id/password-reset': 'genera la clave en el servidor; solo valida el :id'` en `WITHOUT_BODY` y `['POST /api/students/:id/password-reset', 'passwordReset']` en la lista de limitadas. Correr `tests/unit/services/auth tests/unit/routes/students tests/unit/app` → PASS; lint.
- [ ] **Step 5: Commit** `feat(students): el PT blanquea la clave del alumno con una temporal`

### Task 8: Modelo del CSV

**Files:**
- Create: `backend/src/models/export/sessions-csv.js`
- Test: `backend/tests/unit/models/export/sessions-csv.test.js`

**Interfaces:**
- Produces:
  - `STUDENT_HEADERS: string[]` (14, Global Constraints), `TRAINER_HEADERS = ['Alumno', 'Email', 'Activo', ...STUDENT_HEADERS]`.
  - `escapeCell(value) => string`: `null/undefined` → `''`; texto que empieza con `=`, `+`, `-`, `@` o `\t` → prefijo `'`; con `;`, `"`, `\r` o `\n` → entre comillas con `""`.
  - `decimalAR(n) => string`: `72.5` → `'72,5'`, `80` → `'80'`, `null` → `''`.
  - `sessionRows(session, student?) => string[][]`: una fila por serie (orden `executed_at`, `set_number`); sin series, una fila con las columnas de serie vacías. Con `student`, antepone `name`, `email`, `Sí|No`.
  - `toCsv(headers, rows) => string`: `'\uFEFF'` + líneas unidas por `;` y `\r\n`, con `\r\n` final.
  - Formatos: Fecha `DD/MM/AAAA` y Hora `HH:MM` en Argentina (`utcToArgentina` de `shared/utils/dates/argentina.js`); Duración = minutos redondeados entre `started_at` y `finished_at` (vacía sin `finished_at`); "Ejercicio planificado" = `original.name` solo si hay `original_exercise_id`; Completada `Sí|No`; números (Serie, Reps, Descanso, RPE) sin formato. La sesión que llega tiene la forma del repo (Task 9): `{ started_at, finished_at, rpe, notes, trainer_comment, routine: { name } | null, session_sets: [{ set_number, actual_reps, actual_kg, completed, rest_seconds, executed_at, exercise: { name }, original: { name } | null }] }`.

- [ ] **Step 1: Tests que fallan:** empieza con BOM; encabezado exacto con `;`; filas terminan en `\r\n`; `'Press; banca'` → `"Press; banca"`; `'dijo "bien"'` → `"dijo ""bien"""`; nota con `\n` → entre comillas; `'=SUMA(A1)'` → `'=SUMA(A1)` con apóstrofo (y `+`, `-`, `@`, tab); `actual_kg: 72.5` → `72,5`; sesión sin series → una fila con 8 celdas de serie vacías; `started_at: '2026-11-09T02:30:00Z'` → `08/11/2026` y `23:30`; sin `finished_at` → duración vacía (Review Focus 3); con `student` inactivo → `Activo` = `No`; sustitución → columna "Ejercicio planificado" con el nombre original.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar** (puro, sin imports de Supabase ni Express).
- [ ] **Step 4: Correr** → PASS; lint (si pasa de 200 líneas, dividir en `models/export/sessions-csv/`).
- [ ] **Step 5: Commit** `feat(export): modelo del CSV de sesiones para Excel en español`

### Task 9: Repositorio y service de exportación

**Files:**
- Create: `backend/src/repositories/export/sessions-export.repository.js`, `backend/src/services/export/sessions-export.service.js`, `backend/tests/helpers/export/sessions-export.setup.js`
- Test: `backend/tests/unit/services/export/sessions-export.service.test.js`, `backend/tests/unit/repositories/export/sessions-export.repository.test.js`

**Interfaces:**
- Consumes: Task 8; `assertCanAccessStudent`; `utcToArgentina`.
- Produces:
  - repo `findSessionsForStudents(studentIds: string[]) => Promise<Session[]>`: `select('id, student_id, started_at, finished_at, rpe, notes, trainer_comment, routine:routines(name), session_sets(set_number, actual_reps, actual_kg, completed, rest_seconds, executed_at, exercise:exercises!session_sets_exercise_id_fkey(name), original:exercises!session_sets_original_exercise_id_fkey(name))')`, `.in('student_id', ids)`, `.order('started_at').order('id')`, páginas de 500 con `.range` hasta una página corta. Lista vacía → `[]` sin consultar.
  - repo `findTrainerStudents(trainerId) => Promise<{ id, name, email, active }[]>` (activos e inactivos, orden `name`).
  - service `forStudent(user, studentId) => { filename, csv }` y `forTrainer(user) => { filename, csv }`. `filename`: alumno sobre sí mismo → `fittrainer-mis-sesiones-<fecha AR>.csv`; PT sobre un alumno → `fittrainer-<slug del nombre>-<fecha AR>.csv`; PT todos → `fittrainer-alumnos-<fecha AR>.csv`. El PT sobre un alumno usa `TRAINER_HEADERS`; el alumno, `STUDENT_HEADERS`. `slugify(name)`: minúsculas, sin acentos (`normalize('NFD')`), no alfanumérico → `-`, sin guiones en los bordes; vacío → `alumno`.
- [ ] **Step 1: Tests que fallan:** dueño → CSV con las filas de su alumno; alumno propio → sus filas y `fittrainer-mis-sesiones-…`; ajeno → el 403 de `assertCanAccessStudent` (el spec dice 404; se respeta el chequeo existente); `forTrainer` incluye un alumno inactivo y ordena por alumno y fecha; trainer sin alumnos → solo encabezado; repo: con 1200 sesiones simuladas hace 3 llamadas `.range(0,499)`, `(500,999)`, `(1000,1499)`; `slugify('Martín Pérez') === 'martin-perez'` (Review Focus 1).
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr** → PASS; lint.
- [ ] **Step 5: Verificar el embed contra Supabase dev** (Nota 6): un script descartable o `node -e` que llame `findSessionsForStudents([<id QA>])` y muestre una sesión; si la FK tiene otro nombre, corregir el hint.
- [ ] **Step 6: Commit** `feat(export): sesiones del alumno y de todos los alumnos del PT para el CSV`

### Task 10: Controller y rutas de exportación

**Files:**
- Create: `backend/src/controllers/export/export.controller.js`
- Modify: `backend/src/routes/students/students.routes.js`, `backend/tests/unit/routes/students/students.routes.test.js`, `backend/tests/unit/app/validation-coverage.test.js`
- Test: `backend/tests/unit/controllers/export/export.controller.test.js` (o Supertest sobre `createApp()` en `tests/unit/routes/students/` si es el patrón de la carpeta)

**Interfaces:**
- Consumes: Task 9.
- Produces: `exportTrainer(req, res)` (`GET /students/export`) y `exportStudent(req, res)` (`GET /students/:id/export`); headers `Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="<filename>"`; cuerpo = `csv`.
  - `router.get('/export', limitRate('export'), authenticate, requireRole('trainer'), exportController.exportTrainer)` **antes** de `/:id`.
  - `router.get('/:id/export', limitRate('export'), authenticate, requireRole('trainer', 'student'), validate(validateStudentIdParam, 'params'), exportController.exportStudent)` antes de los `router.use('/:id…')`.
- [ ] **Step 1: Tests que fallan:** `/export` va antes de `/:id`; cadenas con limitador primero; el controller setea los dos headers exactos y manda el texto tal cual (con BOM); `filename` con `martin-perez`. En `validation-coverage.test.js`, sumar `['GET /api/students/export', 'export']` y `['GET /api/students/:id/export', 'export']`.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr todo el backend:** `cd backend && npm test` → PASS; `npm run lint` → OK.
- [ ] **Step 5: Commit** `feat(export): GET /students/export y /students/:id/export en CSV`

## Web

Comandos: `cd frontend && npx vitest run <path>` y `cd frontend && npm run lint`.

### Task 11: CSV por el cliente, descarga y `account.api`

**Files:**
- Modify: `frontend/src/api/shared/client.js` (`readBody`), `frontend/src/utils/download.js`
- Create: `frontend/src/api/account/account.api.js`
- Test: `frontend/tests/api/shared/client/csv.test.js`, `frontend/tests/utils/download.test.js`, `frontend/tests/api/account/account.api.test.js`

**Interfaces:**
- Produces:
  - `readBody`: si `res.headers.get('content-type')` incluye `text/csv`, devuelve el texto sin parsear.
  - `downloadText(text: string, filename: string, type = 'text/plain') => void`: `Blob` + `URL.createObjectURL` + `downloadUrl` + `URL.revokeObjectURL`.
  - `changePassword({ current_password, new_password, refresh_token }) => request('/auth/password', { method: 'PUT', body })` (con `auth` y `refresh` por defecto); `resetStudentPassword(studentId) => api.post(\`/students/${id}/password-reset\`)`; `exportSessions(studentId?) => api.get(studentId ? \`/students/${id}/export\` : '/students/export')` → `string`.
- [ ] **Step 1: Tests que fallan:** `fetch` mockeado con `text/csv; charset=utf-8` y cuerpo `'\uFEFFFecha;Hora\r\n'` → `request` devuelve ese string exacto; JSON sigue parseando; un 403 JSON sigue tirando `ApiError`. `downloadText` crea un `Blob` de tipo `text/csv`, hace clic en un `<a download="x.csv">` y revoca la URL. `account.api`: método, path y body de cada función.
- [ ] **Step 2: Correr** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr** los tres y `tests/api/shared` → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): cliente que devuelve CSV como texto y API de la cuenta`

### Task 12: Reglas de clave y antigüedad

**Files:**
- Create: `frontend/src/utils/account/passwordRules.js`, `frontend/src/utils/account/passwordAge.js`
- Test: `frontend/tests/utils/account/passwordRules.test.js`, `frontend/tests/utils/account/passwordAge.test.js`

**Interfaces:**
- Produces:
  - `PASSWORD_RULES = [{ id: 'length', label: '8 caracteres o más' }, { id: 'upper', label: 'Una mayúscula' }, { id: 'number', label: 'Un número' }]`; `checkPasswordRules(pw) => { id, label, ok }[]`.
  - `validatePasswordChange({ current_password, new_password, repeat }) => Record<field, message>`: actual vacía → "Ingresá tu contraseña actual"; reglas incumplidas → "Tiene que tener 8 caracteres o más, una mayúscula y un número" en `new_password`; igual a la actual → "Tiene que ser distinta de la actual"; `repeat` distinta → "Las contraseñas no coinciden" en `repeat`.
  - `passwordAgeLabel(changedAt: string|null, now = new Date()) => string`: `null` → "Nunca la cambiaste"; < 1 día → "Modificada hoy"; 1 día → "Modificada hace 1 día"; < 60 días → "Modificada hace N días"; si no → "Modificada hace N meses" (`plural` de `utils/shared/plural.js`).
- [ ] **Step 1: Tests que fallan** con esos valores (incluye 59 días → "59 días", 61 → "2 meses", `null`).
- [ ] **Step 2–4:** correr → FAIL; implementar; correr → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): reglas de la clave y "Modificada hace…"`

### Task 13: Store y hooks de la cuenta

**Files:**
- Modify: `frontend/src/hooks/auth/useAuthStore.js`
- Create: `frontend/src/hooks/account/useChangePassword.js`, `frontend/src/hooks/account/useExportCsv.js`, `frontend/src/hooks/account/useResetStudentPassword.js`
- Test: `frontend/tests/hooks/auth/useAuthStore/change-password.test.js`, `frontend/tests/hooks/account/useExportCsv.test.jsx`

**Interfaces:**
- Consumes: Task 11.
- Produces:
  - store `changePassword({ current_password, new_password }) => Promise<void>`: llama `accountApi.changePassword({ ..., refresh_token: refreshToken })` y hace `set({ token, user: { ...user, must_change_password: false, password_changed_at } })`; si falla, tira el `ApiError` sin tocar la sesión.
  - `restore()` y `renewAccessToken()` copian `must_change_password` del refresh a `user` (solo si viene en la respuesta).
  - `useChangePassword() => { submit(values) => Promise<void>, isPending }`.
  - `useExportCsv({ studentId, filename }) => { download() => Promise<void>, isPending, error }` (`useMutation`; `filename` lo arma quien llama con `todayString()`).
  - `useResetStudentPassword(studentId) => useMutation` cuyo `mutateAsync()` devuelve `{ temporary_password }`.
- [ ] **Step 1: Tests que fallan:** `changePassword` manda el `refreshToken` del store, guarda el token nuevo, apaga el flag y setea `password_changed_at`; error 400 → store intacto; `restore()` con refresh `{ token, must_change_password: true }` → `user.must_change_password === true` (Review Focus 4); `useExportCsv.download()` llama `downloadText(csv, filename, 'text/csv')`.
- [ ] **Step 2–4:** correr → FAIL; implementar (store ≤ 200 líneas, hoy 112); correr `tests/hooks/auth tests/hooks/account` → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): cambio de clave en el store y hooks de la cuenta`

### Task 14: Formulario y diálogo de cambio de clave

**Files:**
- Create: `frontend/src/components/account/ChangePasswordForm.jsx`, `frontend/src/components/account/ChangePasswordDialog.jsx`
- Test: `frontend/tests/components/account/ChangePasswordDialog.test.jsx`

**Interfaces:**
- Consumes: Tasks 12, 13; `Dialog`, `Input`, `Button`, `fieldErrorsFrom`.
- Produces:
  - `ChangePasswordForm({ formId, currentLabel = 'Contraseña actual', onSuccess })`: campos `current_password`, `new_password`, `repeat` ("Repetir nueva") con la lista de reglas en vivo (`aria-live`, ✓/· por regla); valida con `validatePasswordChange`; envía con `useChangePassword`; errores del backend con `fieldErrorsFrom(error, { fields: ['current_password', 'new_password'], fallback: 'No pudimos cambiar la contraseña' })`.
  - `ChangePasswordDialog({ open, onClose, onChanged })`: título "Cambiar contraseña", footer Cancelar / Guardar (`form={formId}`); al éxito `onChanged()` y `onClose()`.
- [ ] **Step 1: Tests que fallan:** reglas pasan a ✓ al tipear `Abcdefg1`; repetir distinta → "Las contraseñas no coinciden" sin llamar la API; backend `400` con `details: [{ field: 'current_password', message: 'La contraseña actual es incorrecta' }]` → el mensaje en el campo actual; éxito → el store tiene el token nuevo y se llama `onChanged`.
- [ ] **Step 2–4:** FAIL → implementar → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): diálogo para cambiar la contraseña`

### Task 15: `AccountCard` en Mi perfil del alumno

**Files:**
- Create: `frontend/src/components/account/AccountCard.jsx`, `frontend/src/components/account/AccountRow.jsx`
- Modify: `frontend/src/pages/student/MyProfilePage.jsx`
- Test: `frontend/tests/pages/student/MyProfilePage/account.test.jsx`

**Interfaces:**
- Consumes: Tasks 12–14.
- Produces:
  - `AccountRow({ title, subtitle, actionLabel, onAction, loading })` (fila del prototipo: título, subtítulo mono, botón ghost sm).
  - `AccountCard({ exportLabel, exportSubtitle, exportStudentId, exportFilename })`: título "Cuenta"; fila "Contraseña" con `passwordAgeLabel(user.password_changed_at)` y "Cambiar" (abre `ChangePasswordDialog`); aviso `role="status"` "Listo. Cerramos tu sesión en los otros dispositivos." tras cambiarla; fila de exportación con "Descargar" (`useExportCsv`) y, si falla, "No pudimos descargar el archivo".
  - En `MyProfilePage`, la columna derecha pasa a `<div className="flex min-w-0 flex-col gap-5">` con `StudentMetrics` y debajo `<AccountCard exportLabel="Exportar mis datos" exportSubtitle="Historial completo en formato CSV" exportStudentId={studentId} exportFilename={\`fittrainer-mis-sesiones-${todayString()}.csv\`} />`.
- [ ] **Step 1: Tests que fallan:** se ven "Contraseña", "Nunca la cambiaste" (o "Modificada hace 3 días" con `password_changed_at` fijo y fecha simulada), "Exportar mis datos", "Historial completo en formato CSV"; "Descargar" llama `GET /students/s-1/export` y `downloadText` con el nombre del día; "Cambiar" abre el diálogo. Los tests existentes de `MyProfilePage/` siguen verdes.
- [ ] **Step 2–4:** FAIL → implementar → PASS (`tests/pages/student/MyProfilePage`); lint.
- [ ] **Step 5: Commit** `feat(web): tarjeta Cuenta en Mi perfil con cambiar clave y exportar CSV`

### Task 16: Cuenta del PT y botón Configuración

**Files:**
- Create: `frontend/src/pages/account/TrainerAccountPage.jsx`
- Modify: `frontend/src/routes/routeTable.js` (`TRAINER_ACCOUNT`), `frontend/src/routes/router.jsx`, `frontend/src/components/shared/layout/UserBlock.jsx`
- Test: `frontend/tests/pages/account/TrainerAccountPage.test.jsx`, `frontend/tests/components/shared/layout/UserBlock.test.jsx`, `frontend/tests/routes/routeTable.test.js` (caso nuevo)

**Interfaces:**
- Produces:
  - `TRAINER_ACCOUNT = { path: '/pt/cuenta', title: 'Tu cuenta', subtitle: 'CONTRASEÑA Y DATOS' }` (fuera de `TRAINER_NAV.items`).
  - `TrainerAccountPage`: `<AccountCard exportLabel="Exportar los datos de tus alumnos" exportSubtitle="Todas sus sesiones en CSV" exportFilename={\`fittrainer-alumnos-${todayString()}.csv\`} />` (sin `exportStudentId`).
  - `UserBlock`: botón ícono `Settings` con `aria-label`/`title` "Configuración" junto a "Cerrar sesión" (fila de dos botones; en compacto, solo íconos), navega a `TRAINER_ACCOUNT.path` si `user.role === 'trainer'` y a `MY_PROFILE_PATH` si es alumno.
- [ ] **Step 1: Tests que fallan:** `renderRoute('/pt/cuenta')` con `TRAINER` muestra "Tu cuenta" en la topbar y las dos filas; "Descargar" llama `GET /students/export`; `UserBlock` con trainer navega a `/pt/cuenta` y con alumno a `/alumno/perfil`; `TRAINER_NAV.items` no incluye `cuenta`. Los tests de `AppShell/` siguen verdes.
- [ ] **Step 2–4:** FAIL → implementar → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): página Tu cuenta del PT y botón Configuración en el sidebar`

### Task 17: Cambio obligatorio de clave

**Files:**
- Move: `frontend/tests/routes/guards.test.jsx` → `frontend/tests/routes/guards/roles.test.jsx` (`git mv`, Nota 9; ajustar imports relativos si los hay)
- Modify: `frontend/src/routes/guards.jsx` (`RequireRole`, nuevo `RequirePasswordChange`), `frontend/src/routes/routeTable.js` (`CHANGE_PASSWORD_PATH = '/cambiar-clave'`), `frontend/src/routes/router.jsx`
- Create: `frontend/src/pages/auth/ChangePasswordRequiredPage.jsx`
- Test: `frontend/tests/routes/guards/must-change.test.jsx`, `frontend/tests/pages/auth/ChangePasswordRequiredPage.test.jsx`

**Interfaces:**
- Consumes: Task 14 (`ChangePasswordForm` con `currentLabel="Clave temporal"`).
- Produces: `RequireRole` → `<Navigate to={CHANGE_PASSWORD_PATH} replace />` si `user.must_change_password` (después del chequeo de sesión, antes del de rol); `RequirePasswordChange` (chequeando → `SessionLoading`; sin sesión → `/login`; sin flag → home del rol; si no `<Outlet />`); ruta `{ element: <RequirePasswordChange />, children: [{ path: CHANGE_PASSWORD_PATH, element: <ChangePasswordRequiredPage /> }] }`. La página: layout de `/login` (BrandMark, `Card`), texto "Tu entrenador/a te dio una clave temporal. Elegí una nueva para seguir.", el form y un botón "Cerrar sesión" (`logout`); al guardar, `navigate(homeFor(role), { replace: true })`.
- [ ] **Step 1: Tests que fallan:** con `{ ...STUDENT, must_change_password: true }`, `/alumno/hoy`, `/alumno/perfil` y `/` terminan en `/cambiar-clave` y `fetch` no recibe ningún pedido (Review Focus 4); sin flag, `/cambiar-clave` → `/alumno/hoy`; sin sesión → `/login`; la página guarda y navega a `/alumno/hoy`; "Cerrar sesión" deja `status: 'anonymous'`.
- [ ] **Step 2–4:** FAIL → implementar → PASS (`tests/routes tests/pages/auth`); lint.
- [ ] **Step 5: Commit** `feat(web): con la clave blanqueada, el alumno elige una nueva antes de seguir`

### Task 18: Blanqueo desde la ficha

**Files:**
- Create: `frontend/src/components/students/dialogs/ResetPasswordSection.jsx`
- Modify: `frontend/src/components/students/dialogs/EditStudentDialog.jsx` (debajo del `<form>`, `<ResetPasswordSection student={student} />` solo si `student.active`)
- Test: `frontend/tests/components/students/dialogs/ResetPasswordSection.test.jsx`

**Interfaces:**
- Consumes: `useResetStudentPassword` (Task 13).
- Produces: sección "Acceso a la app" con tres estados internos (sin `Dialog` anidado): `idle` → botón "Blanquear clave"; `confirm` → "Se cierra su sesión en todos sus dispositivos" + "Cancelar" / "Blanquear" (danger, `loading`, deshabilitado mientras envía); `done` → la clave en `font-mono` grande, botón "Copiar" (`navigator.clipboard.writeText`, luego "Copiada") y "Se muestra una sola vez. Al entrar, tendrá que elegir una nueva." Error → mensaje `role="alert"` ("No pudimos blanquear la clave" o el del backend) y vuelve a `confirm`. La clave vive solo en el estado del componente.
- [ ] **Step 1: Tests que fallan:** flujo completo con `POST /students/s-1/password-reset` → `{ temporary_password: 'Ab3kP9mQx2' }`; dos clics seguidos en "Blanquear" hacen un solo pedido (Review Focus 5); "Copiar" escribe la clave; error 409 → mensaje y botón de nuevo; al desmontar y volver a montar no se ve la clave.
- [ ] **Step 2–4:** FAIL → implementar → PASS; lint (EditStudentDialog ≤ 200).
- [ ] **Step 5: Commit** `feat(web): el PT blanquea la clave desde Editar alumno`

## Docs y cierre

### Task 19: Contrato, modelo, auditoría y CONTRIBUTING

**Files:**
- Modify: `docs/arquitectura/contratos-api.md` (Auth: `POST /auth/login` y `/auth/refresh` con los campos nuevos, `PUT /auth/password`; Alumnos: `GET /students/:id` con las 2 columnas, `POST /students/:id/password-reset`, `GET /students/export`, `GET /students/:id/export`; errores comunes: `PASSWORD_CHANGE_REQUIRED`), `docs/arquitectura/modelo-de-datos.md` (columnas de `trainers` y `students`), `docs/proceso/auditoria-seguridad.md` (fila 6: limitadores `passwordChange`, `passwordReset`, `export`), `CONTRIBUTING.md` (Excepciones de nombre: `export` en el backend y `account` en la web, Nota 2)

- [ ] **Step 1:** escribir cada sección con los bodies, respuestas, códigos y headers de Datos del spec (formato de las secciones vecinas).
- [ ] **Step 2:** `git diff --stat` solo muestra esos 4 archivos.
- [ ] **Step 3: Commit** `docs(api): contrato y modelo de la cuenta (GX1)`

### Task 20: Verificación completa en el navegador

**Files:** capturas en `docs/superpowers/specs/assets/gx1/` (`01-perfil-cuenta.jpg` … `08-angosto-375.jpg`, nombres del spec).

- [ ] **Step 1: Suites completas.** `cd backend && npm test && npm run lint`; `cd frontend && npx vitest run && npm run lint` → todo verde, ningún archivo > 200 líneas.
- [ ] **Step 2: Levantar** backend (`npm run dev`) y web contra Supabase dev con la migración aplicada; PT y alumno de QA.
- [ ] **Step 3: Alumno.** Mi perfil → tarjeta Cuenta (01); Cambiar → reglas en vivo y error de la actual (02); guardar → aviso. En un segundo navegador con la misma cuenta: al vencer su access, el refresh da 401 y vuelve a `/login`; el primero sigue sin volver a entrar.
- [ ] **Step 4: PT.** Configuración → `/pt/cuenta` (03); Editar alumno → Blanquear (04) → clave visible y Copiar (05).
- [ ] **Step 5: Cambio obligatorio.** Login del alumno con la temporal → `/cambiar-clave` (06), ningún otro pedido en la pestaña Network; `curl` con ese access a `GET /api/routines/today` → `403 PASSWORD_CHANGE_REQUIRED`; elegir una nueva → home.
- [ ] **Step 6: CSV.** Descargar como alumno y como PT; abrir con doble clic en Excel en español: acentos bien, columnas separadas, `72,5` como número (07).
- [ ] **Step 7: Angosto.** 375 px en Mi perfil y en el diálogo (08): sin scroll horizontal.
- [ ] **Step 8: Commit** `docs(web): capturas de la GX1`. Después, `git merge origin/develop`, review de dos ejes y PR a `develop` titulada `feat(auth): cambiar contraseña, blanqueo y exportar CSV (GX1)`, con las 4 tarjetas para el celular de Igna en el cuerpo.
