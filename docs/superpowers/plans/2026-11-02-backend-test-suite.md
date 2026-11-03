# Suite de pruebas del backend (tarjeta 52) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los cinco bloques de riesgo del backend con unitarios nuevos y una suite de integración real (Supertest contra Supabase dev), sumar CI en cada PR y dejar `docs/proceso/plan-de-pruebas.md` con evidencia.

**Architecture:** La integración corre `createApp()` en el mismo proceso con Supertest, con config de Jest propia (`jest.integration.config.js`, `--runInBand`, 30 s) y un guard que corta si `backend/.env` no apunta a un Supabase real. Todo se crea por la API con emails `it.<corrida>.<rol>@test.fittrainer.dev`; el borrado (lo único directo) vive en `scripts/lib/qa-cleanup.js` y lo comparten el `afterAll` de cada archivo y `npm run test:integration:clean`. `npm test` sigue siendo solo unitarios.

**Tech Stack:** Express ESM + supabase-js + Jest 29 ESM (`npm test`) + Supertest 7 (nuevo, devDependency exacta); GitHub Actions (Node 22); web: Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-backend-test-suite-design.md`

## Global Constraints

- CONTRIBUTING: archivos de código ≤ 200 líneas físicas (tests incluidos; `npm run lint` corre ESLint `max-lines` + `scripts/check-file-length.js`), carpetas ≤ 10 archivos, capa → módulo → archivo, tests espejo de `src` (un test que se divide va en carpeta con el nombre de la unidad), utilidades de test en `tests/helpers/<módulo>/`.
- Tests con `npm test` / `npm run test:integration` (nunca `npx jest`). Todo desde `backend/`.
- Commits en español, Conventional Commits (`test(…)`, `chore(…)`, `ci`, `docs(…)`), **sin** trailers ni firmas de IA.
- `npm test` **no** levanta `tests/integration/` ni usa red.
- Integración: contra Supabase dev (compartido con Igna), `NODE_ENV=test`, `TZ=UTC`, en serie, timeout 30 s. FCM apagado (ya lo está en test), sin fotos (mensajes solo texto), sin jobs.
- Datos de QA: id de corrida = `Date.now().toString(36)` + 4 caracteres al azar; emails `it.<corrida>.<rol>@test.fittrainer.dev`; nombres `IT · …`. La integración nunca toca filas que no creó.
- Teardown: borrar `notifications`, `push_tokens` y `refresh_tokens` por `user_id in (PT y alumnos de la corrida)` y después los `trainers` (cascada). `test:integration:clean` borra los trainers QA creados hace más de 1 hora.
- CI: Node 22, `npm ci`; backend `npm run lint && npm test`; frontend `npm run lint && npx vitest run --maxWorkers=2 --testTimeout=15000 && npm run build`. Sin secretos, sin integración, sin mobile.
- Un problema real chico y seguro se arregla en la PR con su test; uno grande o que cambie comportamiento se documenta en "Limitaciones conocidas".
- Precondición de la integración: `backend/.env` con las credenciales de dev. En el worktree `C:\ft-23` no existe: copiarlo (no moverlo) desde `backend/.env` de la copia principal. Está en `.gitignore`.

## Review Focus

1. `npm run test:integration` sin `backend/.env` o con `SUPABASE_URL` en `localhost:54321` → corta antes de crear nada, con un mensaje que dice qué falta (Task 1 unit + Task 2 paso manual).
2. Un test de integración que falla a mitad → el `afterAll` igual borra la corrida y `npm run test:integration:clean -- --check` da 0 (Task 2: smoke que verifica el borrado; Task 13 verificación).
3. `qa-cleanup` recibe un id de trainer que no es QA (email fuera del patrón) → no lo borra ni toca sus alumnos (Task 1).
4. `npm test` lista algún `*.int.test.js` → no debe (Task 2: `--listTests`).
5. Sesión que empieza 23:30 de Buenos Aires (02:30Z del día siguiente) → cuenta en el día y la semana argentinos en `exercise_progress` y `weekly_volume` (Task 8).

---

### Task 1: Guard de entorno y limpieza de QA (scripts)

**Files:**
- Create: `backend/scripts/lib/qa-env.js`, `backend/scripts/lib/qa-cleanup.js`, `backend/scripts/integration-clean.js`
- Modify: `backend/package.json` (script `test:integration:clean`)
- Test: `backend/tests/unit/scripts/lib/qa-env.test.js`, `backend/tests/unit/scripts/lib/qa-cleanup.test.js`

**Interfaces (Produces):**
- `qa-env.js`: `QA_EMAIL_DOMAIN = 'test.fittrainer.dev'`, `QA_EMAIL_LIKE = 'it.%@test.fittrainer.dev'`, `assertRealSupabase(env: object): void` — lanza `Error` con mensaje que empieza con `"Integración frenada:"` y nombra la variable si `SUPABASE_URL` falta, está vacía o contiene `localhost:54321` / `127.0.0.1:54321`, o si `SUPABASE_SERVICE_ROLE_KEY` falta o es `test-service-role-key`.
- `qa-cleanup.js`: `deleteQaData(supabase, trainerIds: string[]): Promise<{ trainers: number, students: number }>` — 1) relee `trainers` con `.in('id', trainerIds).like('email', QA_EMAIL_LIKE)` (solo esos se tocan); 2) `students.select('id').in('trainer_id', confirmados)`; 3) borra `notifications`, `push_tokens`, `refresh_tokens` con `.in('user_id', [...trainers, ...students])`; 4) borra `trainers` `.in('id', confirmados)`. Con lista vacía no llama a la base. Errores de supabase → `throw`.
- `qa-cleanup.js`: `findStaleQaTrainerIds(supabase, { now = new Date(), olderThanMs = 3600000, all = false } = {}): Promise<string[]>` — `trainers.select('id').like('email', QA_EMAIL_LIKE)` y, salvo `all`, `.lt('created_at', now - olderThanMs)`.
- `integration-clean.js` (CLI): `dotenv/config` → `assertRealSupabase(process.env)` → `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` directo (no importar `src/config`) → con `--check` imprime `QA restantes: N` (con `all: true`) y sale con código 1 si N > 0; sin flag borra los viejos e imprime `Borrados: X trainers QA, Y alumnos`.
- Script: `"test:integration:clean": "node scripts/integration-clean.js"`.

- [ ] **Step 1: Tests de `qa-env`**: `it.each` con `{}`, `{ SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'x' }`, URL real + key `test-service-role-key`, URL real + key vacía → `toThrow(/Integración frenada:.*SUPABASE_/)`; URL `https://abc.supabase.co` + key real → no lanza.
- [ ] **Step 2: Tests de `qa-cleanup`** con un fake de supabase que registra cada cadena (`from`, método, filtros) y devuelve filas configurables: (a) `deleteQaData(fake, [])` no llama a `from`; (b) con `['t-qa','t-ajeno']` donde la relectura devuelve solo `t-qa` → los `delete` de las tres tablas sin FK reciben `user_id in ['t-qa','s-1','s-2']` y el de `trainers` `id in ['t-qa']` (nunca `t-ajeno`), en ese orden (las tablas sin FK antes que `trainers`); devuelve `{ trainers: 1, students: 2 }`; (c) un `error` de supabase en un delete → rechaza; (d) `findStaleQaTrainerIds` usa `like('email', 'it.%@test.fittrainer.dev')` y `lt('created_at', '<now - 1 h ISO>')`; con `all: true` no hay `lt`.
- [ ] **Step 3:** `npm test -- tests/unit/scripts/lib` → FAIL (módulos inexistentes).
- [ ] **Step 4:** Implementar los tres archivos y el script de `package.json`.
- [ ] **Step 5:** `npm test -- tests/unit/scripts/lib` → PASS; `npm run lint` → OK.
- [ ] **Step 6: Commit** `test(integration): guard de Supabase real y limpieza de datos de QA`.

### Task 2: Infraestructura de integración (config, helpers, teardown, smoke)

**Files:**
- Modify: `backend/package.json` (devDependency `supertest` exacta: `npm i -D --save-exact supertest@7`; script `test:integration`), `backend/jest.config.js` (`testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/integration/']`), `backend/tests/integration/README.md` (cómo correrla, precondición del `.env`, limpieza)
- Create: `backend/jest.integration.config.js`, `backend/tests/helpers/integration/{global-setup.js,after-env.js,run-id.js,api.js,registry.js,actors.js,fixtures.js,teardown.js}`, `backend/tests/integration/smoke.int.test.js`

**Interfaces:**
- Consumes: Task 1 (`assertRealSupabase`, `deleteQaData`).
- `jest.integration.config.js`: `testEnvironment: 'node'`, `testMatch: ['<rootDir>/tests/integration/**/*.int.test.js']`, `testTimeout: 30000`, `globalSetup: '<rootDir>/tests/helpers/integration/global-setup.js'`, `setupFilesAfterEnv: ['<rootDir>/tests/helpers/integration/after-env.js']`, `verbose: true`.
- Script: `"test:integration": "cross-env NODE_ENV=test TZ=UTC node --experimental-vm-modules node_modules/jest/bin/jest.js -c jest.integration.config.js --runInBand"`.
- `global-setup.js`: default export async que hace `import 'dotenv/config'` y `assertRealSupabase(process.env)`.
- `after-env.js`: `afterAll(cleanupRun)` (corre aunque fallen los tests del archivo).
- `run-id.js`: `RUN_ID: string`, `qaEmail(role: string): string` → `it.${RUN_ID}.${role}@test.fittrainer.dev`, `qaName(label: string): string` → `IT · ${label}`. `QA_PASSWORD` = una constante de test de ≥ 8 caracteres definida acá (no repetirla en otros archivos).
- `api.js`: `api(token?: string)` → `{ get, post, patch, put, delete }(path)`, cada uno `request(app)[m]('/api' + path)` con `Authorization: Bearer <token>` si hay token; `app = createApp()` una vez por archivo.
- `registry.js`: `trackTrainer(id)`, `trackStudent(id)`, `trackedTrainerIds(): string[]`.
- `actors.js`: `createTrainer(label): Promise<{ id, token, email }>` (`POST /auth/register` → 201 `{ trainer, token }`, lo registra); `inviteAndJoin(trainer, label): Promise<{ id, token, email, trainerId }>` (`POST /invitations` con `delivery_channel: 'qr'` → `data.token`; `POST /students { token, password }` → 201 `{ student, token }`; lo registra).
- `fixtures.js`: `createExercise(trainer, label, muscle_group = 'chest') → id`; `createRoutine(trainer, studentId, { label, exerciseIds, days = ALL_DAYS }) → { id, routineExerciseIds }` (cuerpo según `validations/routines/routines.validation.js`); `ALL_DAYS` = los 7 de `models/routines/routine.model.js` `DAYS`; `setRow({ exerciseId, setNumber, reps, kg, executedAt, completed = true, id = randomUUID() })`; `uploadSession(student, { id = randomUUID(), startedAt, finishedAt = null, routineId = null, sets = [] }) → { sessionId, saved, failed }` (`POST /sessions` + `POST /sessions/:id/sets` si hay series; falla el test si un código no es el esperado).
- `teardown.js`: `cleanupRun(): Promise<void>` → `deleteQaData(supabase, trackedTrainerIds())` con `supabase` de `src/config/supabase.js` (en test toma las credenciales del `.env`). Los alumnos se borran por cascada del trainer (`deleteQaData` ya busca sus ids).

- [ ] **Step 1: Smoke primero** (`smoke.int.test.js`): `createTrainer('smoke')` → 201 y `GET /students` con su token → 200 `data: []`; segundo `it`: `inviteAndJoin` → el alumno hace `GET /students/:id` → 200 con su email. Tercer `it`: `cleanupRun()` y después, con el cliente de servicio, `trainers.select('id').eq('id', trainer.id)` → 0 filas (y `cleanupRun` sigue siendo idempotente si lo vuelve a llamar `after-env`).
- [ ] **Step 2:** `npm run test:integration` → FAIL (falta supertest/config).
- [ ] **Step 3:** Implementar config, script, helpers y `jest.config.js`.
- [ ] **Step 4:** Con `backend/.env` de dev: `npm run test:integration` → PASS (3 tests). Sin `.env` (renombrarlo un momento): sale con `Integración frenada: … SUPABASE_URL …` y sin requests.
- [ ] **Step 5:** `npm test -- --listTests | findstr int.test` (o `grep`) → sin resultados; `npm test` → todo verde, misma cantidad de tests que antes + los de Task 1; `npm run lint` → OK.
- [ ] **Step 6:** `npm run test:integration:clean -- --check` → `QA restantes: 0`.
- [ ] **Step 7: Commit** `test(integration): Supertest, config y helpers de la suite de integración`.

### Task 3: Unitarios — aislamiento de desafíos

**Files:**
- Split: `backend/tests/unit/services/gamification/challenges.service.test.js` (181 líneas) → `backend/tests/unit/services/gamification/challenges.service/list.test.js` (`listChallenges` + `activeStudents`) y `.../challenges.service/write.test.js` (`createChallenge`, `updateChallenge / deleteChallenge`), sin cambiar los tests existentes salvo la ruta del import de `tests/helpers/gamification/challenges.setup.js` (`../../../../helpers/...`).
- Modify: `backend/tests/unit/services/gamification/challenge-assignments.service.test.js` (177 → ≤ 200)

**Interfaces:** Consumes `challenges`, `assignments`, `mockChallenges`, `mockStudentChallenges`, `mockAccess`, `TRAINER`, `challengeRow`, `resetMocks` del setup existente.

- [ ] **Step 1: Tests nuevos en `write.test.js`:**
  - `it.each([['ajeno', 'otro-tr'], ['global', null]])('PATCH sobre desafío %s → 404 CHALLENGE_NOT_FOUND sin actualizar')`: `repo.findById` → `challengeRow({ trainer_id })`; `challenges.updateChallenge(TRAINER, 'ch-1', { name: 'X' })` rechaza `{ statusCode: 404, code: 'CHALLENGE_NOT_FOUND' }`; `repo.update` no llamado.
  - Igual para `deleteChallenge` (ajeno y global) → 404; `repo.hasAssignments` y `repo.remove` no llamados.
  - Inexistente (`findById` → `null`) en update y delete → 404.
- [ ] **Step 2: Test nuevo en `challenge-assignments.service.test.js`:** `listForStudent` con `mockAccess.assertCanAccessStudent.mockRejectedValue(Errors.forbidden())` → rechaza `{ statusCode: 403 }` y `sc.findByStudent` no llamado.
- [ ] **Step 3:** `npm test -- tests/unit/services/gamification` → los nuevos pasan de entrada (cubren código existente): verificar que fallan si se rompe el chequeo (cambiar a mano `challenge.trainer_id !== trainerId` por `false` en `getOwnedChallenge`, correr, ver FAIL, revertir).
- [ ] **Step 4:** `DELETE /notifications/tokens/:token` ya está cubierto (`tests/unit/services/notifications/notifications.service.test.js` "removeToken borra solo del usuario" + `tests/unit/repositories/notifications/push-tokens.repository.test.js`): no se agrega test unitario; queda como evidencia en Task 12 y el caso real va en Task 9.
- [ ] **Step 5:** `npm test` y `npm run lint` verdes. **Commit** `test(challenges): desafío ajeno o global en PATCH/DELETE y listado de alumno ajeno`.

### Task 4: Unitarios — lote de series con falla a mitad

**Files:**
- Create: `backend/tests/unit/services/sessions/persist-sets.test.js` (espeja `src/services/sessions/persist-sets.js`), `backend/tests/unit/services/sessions/session-sets.service/partial-failure.test.js`

**Interfaces:** Consumes `persistSets(sessionId, candidates, existingIds, failed)` (devuelve `[{ value, index, created }]`); mock de `repositories/sessions/session-sets.repository.js` (`insertNewSets(rows) → ids insertados`, `findSetsByIds(ids) → [{ id, session_id }]`, `updateSetInSession(sessionId, id, fields) → boolean`) con `jest.unstable_mockModule` y ruta absoluta (patrón de `notifications.service.test.js`). Para el service, `tests/helpers/sessions/session-sets-service.setup.js`.

- [ ] **Step 1: Tests de `persist-sets.test.js`:**
  - `'un update que falla a mitad rechaza, pero las nuevas ya quedaron insertadas'`: candidatos `s1`, `s2` (nuevos) y `s3`, `s4` (en `existingIds`); `insertNewSets` → `['s1','s2']`; `updateSetInSession` resuelve `true` para `s3` y rechaza `new Error('timeout')` para `s4` → `persistSets` rechaza con `'timeout'`; `insertNewSets` llamado una vez con `s1`, `s2` y `session_id: 'ses-1'`.
  - `'el reintento del mismo lote completa sin duplicar'`: los 4 en `existingIds`, `updateSetInSession` → `true` → devuelve 4 con `created: false` en orden de entrada; `insertNewSets` no llamado; `failed` vacío.
  - `'una serie que antes quedó en failed se guarda al reintentar'`: primera llamada con `s5` nuevo cuyo insert lo omite y `findSetsByIds` → `[]` → `failed` tiene `{ id: 's5', code: 'SET_ID_CONFLICT' }`; segunda llamada con `insertNewSets` → `['s5']` → `[{ …, created: true }]`.
- [ ] **Step 2: Test de `partial-failure.test.js`:** con el setup del service, `updateSetInSession` rechaza en una serie existente → `addSets` rechaza; `markSessionModified`, la evaluación de logros y los triggers no se llaman.
- [ ] **Step 3:** `npm test -- tests/unit/services/sessions` → PASS (cubren código existente; si alguno falla, es un bug: aplicar Q5 de la spec).
- [ ] **Step 4:** Anotar para Task 12 la limitación confirmada: el lote no es transaccional (si un `update` falla, el request da 500 y lo insertado queda; el reintento lo completa).
- [ ] **Step 5:** `npm test`, `npm run lint`. **Commit** `test(sessions): lote de series con un update que falla a mitad y su reintento`.

### Task 5: Unitarios — rutina del día

**Files:**
- Modify: `backend/tests/unit/models/routines/routine.model.test.js` (86 líneas), `backend/tests/unit/services/routines/routines.service/update-and-today.test.js` (98), `backend/tests/unit/repositories/routines/routines.repository.test.js` (45)

**Interfaces:** Consumes `dayName(date)`, `service.today(studentId)`, `findActiveRoutineForStudentToday(studentId, day)`.

- [ ] **Step 1: Tests:**
  - model: `dayName(new Date('2026-08-24T02:59:00Z'))` → `'sunday'` (23:59 AR) y `dayName(new Date('2026-08-24T03:00:00Z'))` → `'monday'`.
  - service (`describe('today · día argentino')` con `jest.useFakeTimers({ now: new Date('2026-08-25T02:59:00Z') })` y `useRealTimers` en `afterEach`): `today('st-1')` llama a `findActiveRoutineForStudentToday` con `('st-1', 'monday')`; día de descanso: el repo devuelve `null` → `today` devuelve `null` (no `undefined`: `toBeNull()`) y no consulta `fetchLastSessionKg`.
  - repo: extender el mock con `contains`, `limit`, `maybeSingle` (encadenables); `findActiveRoutineForStudentToday('st-1', 'monday')` → `eq('student_id','st-1')`, `eq('active', true)`, `contains('days', ['monday'])`, `order('created_at', { ascending: false })`, `limit(1)` y devuelve la fila de `maybeSingle` (dos activas el mismo día → la más reciente); error → `statusCode: 500`.
- [ ] **Step 2:** `npm test -- tests/unit/models/routines tests/unit/services/routines tests/unit/repositories/routines` → PASS (si falla el de 02:59Z, es un bug real de zona horaria → arreglar con su test).
- [ ] **Step 3:** `npm test`, `npm run lint`. **Commit** `test(routines): frontera 23:59 AR, día de descanso y dos rutinas activas el mismo día`.

### Task 6: Integración — flujo de punta a punta

**Files:** Create `backend/tests/integration/flow.int.test.js`

**Interfaces:** Consumes Task 2 (`api`, `createTrainer`, `inviteAndJoin`, `createExercise`, `createRoutine`, `uploadSession`, `setRow`, `qaEmail`, `qaName`, `QA_PASSWORD`). Las formas de respuesta se toman de `docs/arquitectura/contratos-api.md`.

- [ ] **Step 1: Escribir el test** (un `describe` con `it` en orden, estado compartido en variables del `describe`):
  1. `POST /auth/register` (`qaEmail('pt')`) → 201 con `trainer.id`, `token`, `refresh_token`; `POST /auth/login` → 200, `user.role === 'trainer'`.
  2. `POST /invitations` (QR) → 201, `data.token`, `data.qr_base64` empieza con `data:image/png`; `GET /invitations/:token` → 200.
  3. `POST /students { token, password }` → 201 con `student.id` y `token`.
  4. `POST /exercises` → 201; `POST /routines` (los 7 días, ese ejercicio) → 201.
  5. Alumno: `GET /routines/today` → 200 con `data.routine_id` = la rutina y `exercises[0].last_session_kg === null`; `GET /routines/mine` → 200 y la incluye.
  6. Alumno: `uploadSession` con `startedAt` = hace 2 h, `finishedAt` = hace 1 h, 3 series (60×10, 60×10, 60×8) → `saved` 3, `failed` [].
  7. PT: `GET /students/:id/sessions` → 200, `data[0].id` = la sesión, `sets: 3`, `volume_kg: 1680`; `GET /students/:id/sessions/:sessionId` → `exercises[0].sets.length === 3`.
  8. PT: `GET /progress/exercise/:exId?student_id=` → 1 punto con `max_kg: 60`, `volume_kg: 1680`, `e1rm_kg: 80`; `GET /progress/overview?student_id=` → `exercises` incluye el ejercicio.
  9. PT: `PATCH /sessions/:id/comment { trainer_comment: 'IT · Buen trabajo' }` → 200; el detalle lo trae.
  10. Alumno: `GET /students/:id/streak` → 200 con la forma del contrato; `GET /students/:id/achievements` → 200 (array); `GET /achievements` → 200.
- [ ] **Step 2:** `npm run test:integration -- flow` → PASS (si un paso falla por un bug real, aplicar Q5).
- [ ] **Step 3:** `npm run test:integration:clean -- --check` → 0. `npm run lint`. **Commit** `test(integration): flujo de punta a punta PT → alumno → sesión → progreso`.

### Task 7: Integración — idempotencia real del lote

**Files:** Create `backend/tests/integration/sets-idempotency.int.test.js`

**Interfaces:** Consumes Task 2. Un PT, dos alumnos (A y B) y un ejercicio propio.

- [ ] **Step 1: Tests** (cada uno verifica al final con `GET /students/:id/sessions/:sessionId` como el PT):
  - `POST /sessions { id: S, started_at }` → 201; mismo body + `finished_at` → 200 y el detalle trae `finished_at`; tercer envío idéntico → 200 sin cambios.
  - `POST /sessions/S/sets` con `[s1,s2,s3]` → 200 `saved` 3 `created: true`; mismo lote → 200 `saved` 3 `created: false`, `failed: []`; el detalle tiene exactamente 3 series (ids únicos).
  - Lote `[s4, s4']` (mismo id, otras reps) → `saved: [{ id: s4, created: true }]`, `failed: [{ index: 1, code: 'VALIDATION_ERROR' }]`; el detalle guarda las reps del primero.
  - Lote `[s5 válida, s6 con exercise_id inexistente (randomUUID)]` → `s5` guardada, `s6` en `failed` con `EXERCISE_NOT_FOUND`; reintento con `s5` igual y `s6` corregida → `s5` `created: false`, `s6` `created: true`; el detalle tiene 6 series en total.
  - Alumno B: `POST /sessions { id: S }` → 409 `SESSION_ID_CONFLICT`; `POST /sessions/<sesión de B>/sets` con el id `s1` → 200 con `failed: [{ id: s1, code: 'SET_ID_CONFLICT' }]`; la sesión S sigue con sus series.
- [ ] **Step 2:** `npm run test:integration -- sets-idempotency` → PASS. `--check` → 0. `npm run lint`.
- [ ] **Step 3: Commit** `test(integration): idempotencia real de sesiones y lotes de series`.

### Task 8: Integración — progreso con números conocidos

**Files:** Create `backend/tests/integration/progress.int.test.js`, `backend/tests/helpers/integration/progress-data.js` (las series y los esperados de abajo, como constantes)

**Interfaces:** Consumes Task 2. Un PT, un alumno, dos ejercicios propios: P = `IT · Press` (`chest`) y D = `IT · Dominadas` (`back`), y una rutina con P y D en los 7 días (para que `/routines/today` nunca sea `null`).

Reglas del SQL (`04-progress.sql`, `04b-progress-overview.sql`): cuentan las series `completed` con `actual_reps > 0`; e1RM Epley = `kg × (1 + reps/30)` (con 1 rep = kg), excluye reps > 12 y kg 0/null; `max_kg` y volumen incluyen la serie de 13 reps; `max_kg` de un día solo de peso corporal es `null` (no 0); el día y la semana (lunes) son de Buenos Aires. El SQL no redondea: la API redondea con `round1` (1 decimal, `Math.round`). Récord (`session_records`): e1RM de la sesión **estrictamente** mayor al mejor de las sesiones anteriores, contando solo series con kg > 0 (el peso corporal no cuenta); la primera vez con carga no cuenta, aunque antes se haya hecho solo con peso corporal. Requiere la migración `2026-11-02-progress-bodyweight.sql` aplicada en dev (PR `fix/progress-bodyweight`).

**Datos** (cada sesión cierra 1 h después; `executed_at` = inicio + n minutos):

| Sesión | `started_at` (UTC) | Día AR | Series |
|---|---|---|---|
| S1 | `2026-10-06T13:00:00Z` | 06/10 | P 60×10 · P 70×5 · P 65×13 · D 0×8 |
| — | (semana del 12/10 sin sesiones) | | |
| S2 | `2026-10-20T13:00:00Z` | 20/10 | P 72.5×8 · P 80×3 |
| S3 | `2026-10-26T02:30:00Z` | **25/10 23:30** | P 75×6 · P 100×5 `completed: false` · D 0×10 |
| S4 | `2026-10-28T13:00:00Z` | 28/10 | D 10×6 (primera vez con carga después de dos sesiones de peso corporal) |

**Esperados (a mano):**

- e1RM por serie: S1 60×10 = 80.0, 70×5 = 81.667, 65×13 excluida (sería 93.17); S2 72.5×8 = 91.833, 80×3 = 88.0; S3 75×6 = 90.0, la incompleta excluida (sería 116.7); S4 D 10×6 = 12.0 (D 0×8 y D 0×10 no aportan: con la regla vieja daban 0 y S4 marcaba récord).
- `GET /progress/exercise/P?student_id=` → `points`:
  `[{ date: '2026-10-06', max_kg: 70, volume_kg: 1795, e1rm_kg: 81.7, sets: 3, reps: 28 }, { date: '2026-10-20', max_kg: 80, volume_kg: 820, e1rm_kg: 91.8, sets: 2, reps: 11 }, { date: '2026-10-25', max_kg: 75, volume_kg: 450, e1rm_kg: 90, sets: 1, reps: 6 }]`; `pr: { max_kg: { value: 80, date: '2026-10-20' }, e1rm_kg: { value: 91.8, date: '2026-10-20' } }`; `default_metric: 'e1rm_kg'`.
- `GET /progress/exercise/D?student_id=&to=2026-10-25` → `[{ date: '2026-10-06', max_kg: null, volume_kg: 0, e1rm_kg: null, sets: 1, reps: 8 }, { date: '2026-10-25', max_kg: null, volume_kg: 0, e1rm_kg: null, sets: 1, reps: 10 }]`; `pr: { max_kg: null, e1rm_kg: null }`; `default_metric: 'reps'`.
- `GET /progress/exercise/D?student_id=` (sin rango) → los dos de arriba más `{ date: '2026-10-28', max_kg: 10, volume_kg: 60, e1rm_kg: 12, sets: 1, reps: 6 }`; `pr: { max_kg: { value: 10, date: '2026-10-28' }, e1rm_kg: { value: 12, date: '2026-10-28' } }`; `default_metric: 'e1rm_kg'`.
- `GET /progress/overview?student_id=&from=2026-10-05&to=2026-10-25` → `weekly_volume: [{ week_start: '2026-10-05', volume_kg: 1795, sessions: 1 }, { week_start: '2026-10-12', volume_kg: 0, sessions: 0 }, { week_start: '2026-10-19', volume_kg: 1270, sessions: 2 }]` (si S3 se contara en UTC caería en la semana del 26/10 y la del 19/10 daría 820/1); `exercises` (no se filtra por rango): D primero (`days: 3, last_date: '2026-10-28'`), después P (`days: 3, last_date: '2026-10-25'`). S4 cae en la semana del 26/10, fuera del rango.
- `GET /students/:id/sessions` → S1 `sets: 4, volume_kg: 1795, has_pr: false`; S2 `sets: 2, volume_kg: 820, has_pr: true`; S3 `sets: 2, volume_kg: 450, has_pr: false`; S4 `sets: 1, volume_kg: 60, has_pr: false` (peso corporal antes: es la primera vez con carga). Detalle de S2: el grupo de P con `is_pr: true`. Detalle de S3 y de S4: ningún grupo con `is_pr`.
- Alumno `GET /routines/today` → `last_session_kg` P = 75 (la incompleta de 100 no cuenta), D = 10 (S4).

- [ ] **Step 1:** Escribir `progress-data.js` (sesiones y esperados) y el test con un `it` por endpoint, comparando con `toEqual` / `toMatchObject` (sin rangos).
- [ ] **Step 2:** `npm run test:integration -- progress` → PASS. Si un número no coincide, revisar primero el cálculo a mano contra el SQL; si el SQL está mal, Q5 (arreglo chico con migración que corre Pablo, o limitación).
- [ ] **Step 3:** Confirmar que en dev está aplicada `2026-11-02-progress-bodyweight.sql` (PR `fix/progress-bodyweight`: `session_records` ignora kg 0/null y `max_kg` de peso corporal es `null`). Si no está, S4 da `has_pr: true` y D trae `max_kg: 0`: no tocar los esperados, pedirle a Pablo que la aplique.
- [ ] **Step 4:** `--check` → 0, `npm run lint`. **Commit** `test(integration): progreso, volumen semanal y récords con números calculados a mano`.

### Task 9: Integración — aislamiento entre dos PT y dos alumnos

**Files:**
- Create: `backend/tests/helpers/integration/world.js`, `backend/tests/helpers/integration/isolation.js`, `backend/tests/integration/isolation/{trainer-cross,student-cross,wrong-role,lists}.int.test.js`

**Interfaces:**
- Consumes: Task 2.
- `world.js`: `buildWorld(label): Promise<World>`; `World = { trainer, student, exerciseId, routineId, routineExerciseId, sessionId, setId, templateId, challengeId, metricId, messageId, notificationId, pushToken }`. Pasos: trainer + alumno, ejercicio propio, rutina con ese ejercicio, sesión cerrada con una serie, plantilla (`POST /routine-templates`, `structure` según su validación), desafío propio (`goal_type: 'sessions_count'`, `goal_value: 3`, `duration_days: 30`), medida (`POST /students/:id/metrics` como PT), mensaje de texto del PT (`POST /messages/:studentId`), comentario del PT en la sesión (genera la notificación del alumno; su id sale de `GET /notifications` como alumno) y token push del alumno (`POST /notifications/tokens`, `it-<RUN_ID>-<label>`).
- `isolation.js`: `runCases(cases, getWorlds)` arma un `it.each` por fila `{ name, as, method, path(w), body?(w), status, code? }` con `as ∈ {'trainerA','trainerB','studentA','studentB'}` y `w = { A, B }`; en los rechazos verifica `res.status`, `res.body.error.code` (si hay `code`) y `res.body.data === undefined`. `expectNoLeak(body, world)` verifica que `JSON.stringify(body)` no contiene ningún id de `world`. `ownerControl(cases)`: para las filas `GET`, la misma request como el dueño (`trainerA` / `studentA` con los ids de A) → 200.
- Cada archivo arma `A = buildWorld('a')` y `B = buildWorld('b')` en `beforeAll`.

**Tabla (contrato de hoy; código según el service):**

`trainer-cross.int.test.js` — PT B sobre datos de A (y control positivo con PT A en los GET):

| # | Request | Esperado |
|---|---|---|
| 1 | `GET /students/:stA` | 403 |
| 2 | `PATCH /students/:stA` | 403 |
| 3 | `GET /students/:stA/attendance` | 403 |
| 4 | `GET /students/:stA/metrics` | 403 |
| 5 | `POST /students/:stA/metrics` | 403 |
| 6 | `DELETE /students/:stA/metrics/:metricA` | 403 |
| 7 | `DELETE /students/:stB/metrics/:metricA` | 404 `METRIC_NOT_FOUND` |
| 8 | `GET /students/:stA/sessions` | 403 |
| 9 | `GET /students/:stA/sessions/:sessA` | 403 |
| 10 | `GET /students/:stB/sessions/:sessA` | 404 `SESSION_NOT_FOUND` |
| 11 | `PATCH /sessions/:sessA/comment` | 404 `SESSION_NOT_FOUND` |
| 12 | `GET /students/:stA/achievements` | 403 |
| 13 | `GET /students/:stA/achievements/progress` | 403 |
| 14 | `GET /students/:stA/streak` | 403 |
| 15 | `GET /students/:stA/challenges` | 403 |
| 16 | `POST /students/:stA/challenges { challenge_id: chB }` | 403 |
| 17 | `POST /students/:stB/challenges { challenge_id: chA }` | 404 `CHALLENGE_NOT_FOUND` |
| 18 | `GET /routines/:rtA` | 403 |
| 19 | `PATCH /routines/:rtA` | 403 |
| 20 | `POST /routines/:rtA/exercises` | 403 |
| 21 | `PUT /routines/:rtA/exercises/order` | 403 |
| 22 | `PATCH /routines/:rtA/exercises/:reA` | 403 |
| 23 | `DELETE /routines/:rtA/exercises/:reA` | 403 |
| 24 | `PATCH /routines/:rtB/exercises/:reA` | 404 `ROUTINE_EXERCISE_NOT_FOUND` |
| 25 | `POST /routines { student_id: stA }` | 403 |
| 26 | `POST /routines { student_id: stB, exercises: [exA] }` | 403 |
| 27 | `POST /routines/:rtB/exercises [exA]` | 403 |
| 28 | `GET /routine-templates/:tpA` | 404 `TEMPLATE_NOT_FOUND` |
| 29 | `PATCH /routine-templates/:tpA` | 404 `TEMPLATE_NOT_FOUND` |
| 30 | `DELETE /routine-templates/:tpA` | 404 `TEMPLATE_NOT_FOUND` |
| 31 | `POST /routine-templates/:tpA/instantiate { student_id: stB }` | 404 `TEMPLATE_NOT_FOUND` |
| 32 | `POST /routine-templates/:tpB/instantiate { student_id: stA }` | 403 |
| 33 | `POST /routine-templates/from-routine { routine_id: rtA }` | 403 |
| 34 | `PATCH /exercises/:exA` | 403 |
| 35 | `DELETE /exercises/:exA` | 403 |
| 36 | `PATCH /challenges/:chA` | 404 `CHALLENGE_NOT_FOUND` |
| 37 | `DELETE /challenges/:chA` | 404 `CHALLENGE_NOT_FOUND` |
| 38 | `GET /challenges/:chA/active-students` | 404 `CHALLENGE_NOT_FOUND` |
| 39 | `POST /challenges/:chA/assignments { student_ids: [stB] }` | 404 `CHALLENGE_NOT_FOUND` |
| 40 | `GET /progress/exercise/:exA?student_id=stA` | 403 |
| 41 | `GET /progress/exercise/:exA?student_id=stB` | 404 `EXERCISE_NOT_FOUND` |
| 42 | `GET /progress/overview?student_id=stA` | 403 |
| 43 | `GET /progress/body/:stA` | 403 |
| 44 | `GET /messages/:stA` | 403 |
| 45 | `POST /messages/:stA` | 403 |
| 46 | `POST /messages/:stA/read` | 403 |
| 47 | `POST /messages/broadcast { student_ids: [stA, stB] }` | 403 (y B no recibe nada) |
| 48 | `POST /challenges/:chB/assignments { student_ids: [stA] }` | **201** con `created: []`, `skipped: [{ student_id: stA, reason: 'not_your_student' }]` (no es 403: el lote saltea ajenos) |

`student-cross.int.test.js` — alumno B sobre datos del alumno A:

| # | Request | Esperado |
|---|---|---|
| 49 | `GET /students/:stA` | 403 |
| 50 | `GET /students/:stA/attendance` | 403 |
| 51 | `GET /students/:stA/metrics` | 403 |
| 52 | `POST /students/:stA/metrics` | 403 |
| 53 | `GET /students/:stA/sessions` | 403 |
| 54 | `GET /students/:stA/sessions/:sessA` | 403 |
| 55 | `PATCH /sessions/:sessA` | 404 `SESSION_NOT_FOUND` |
| 56 | `POST /sessions/:sessA/sets` | 404 `SESSION_NOT_FOUND` |
| 57 | `POST /sessions { id: sessA }` | 409 `SESSION_ID_CONFLICT` |
| 58 | `GET /progress/exercise/:exA` (sin `student_id`) | 404 `EXERCISE_NOT_FOUND` |
| 59 | `GET /progress/exercise/:exB?student_id=stA` | 403 |
| 60 | `GET /progress/overview?student_id=stA` | 403 |
| 61 | `GET /progress/body/:stA` | 403 |
| 62 | `GET /students/:stA/achievements` | 403 |
| 63 | `GET /students/:stA/achievements/progress` | 403 |
| 64 | `GET /students/:stA/streak` | 403 |
| 65 | `GET /students/:stA/challenges` | 403 |
| 66 | `POST /students/:stA/challenges { challenge_id: chA }` | 403 |
| 67 | `POST /students/:stB/challenges { challenge_id: chA }` | 404 `CHALLENGE_NOT_FOUND` |
| 68 | `GET /messages/:stA` | 403 |
| 69 | `POST /messages/:stA` | 403 |
| 70 | `POST /messages/:stA/read` | 403 |
| 71 | `PATCH /notifications/:notifA/read` | 404 `NOTIFICATION_NOT_FOUND` |
| 72 | `DELETE /notifications/tokens/:tokenA` | **204** y el token de A sigue en `push_tokens` (se verifica con el cliente de servicio) |
| 73 | `POST /sessions/:sessB/sets` con el id `setA` | **200** con `failed: [{ id: setA, code: 'SET_ID_CONFLICT' }]` y la serie de A intacta |

`wrong-role.int.test.js` — rol equivocado (alumno A en endpoints de PT; PT A en endpoints de alumno), todos **403** `FORBIDDEN`:

| # | Request |
|---|---|
| 74–89 | alumno: `GET /students`, `GET /students/overview`, `PATCH /students/:stA` (el propio), `POST /invitations`, `GET /exercises`, `POST /exercises`, `PATCH /exercises/:exA`, `GET /routines`, `POST /routines`, `GET /routines/:rtA` (la propia), `GET /routine-templates`, `POST /challenges`, `PATCH /challenges/:chA`, `POST /challenges/:chA/assignments`, `PATCH /sessions/:sessA/comment`, `POST /messages/broadcast` |
| 90–93 | PT: `POST /sessions`, `GET /routines/today`, `GET /routines/mine`, `GET /exercises/library` |

`lists.int.test.js` — listados del PT B y del alumno B → 200 y `expectNoLeak(body, A)`:

| # | Request |
|---|---|
| 94–101 | PT B: `GET /students`, `GET /students/overview`, `GET /routines`, `GET /routine-templates`, `GET /exercises`, `GET /challenges`, `GET /messages/conversations`, `GET /notifications` |
| 102–105 | alumno B: `GET /challenges`, `GET /routines/mine`, `GET /notifications`, `GET /messages/unread-count` (cuenta solo lo suyo) |

Fuera de tabla, a propósito: `POST /notifications/tokens` con un token de otro usuario lo **reasigna** (es del dispositivo; está así por diseño y testeado en el service).

- [ ] **Step 1:** Escribir `world.js` + `isolation.js` y `trainer-cross` (filas 1–48 + control positivo de sus GET).
- [ ] **Step 2:** `npm run test:integration -- isolation/trainer-cross` → PASS. Un código distinto del de la tabla: si el dato de A queda expuesto o modificado → bug (Q5); si solo cambia 403↔404 sin filtrar nada → se ajusta la tabla y se anota.
- [ ] **Step 3:** `student-cross`, `wrong-role`, `lists`; correr cada uno → PASS.
- [ ] **Step 4:** `npm run test:integration` completo → PASS; `--check` → 0; `npm run lint`.
- [ ] **Step 5: Commit** `test(integration): aislamiento entre dos entrenadores y dos alumnos en todos los endpoints con id`.

### Task 10: Integración — aislamiento de la agenda (requiere la #49 en develop)

**Arranca solo después del merge de la #49** (`feature/agenda`): `git merge origin/develop` en la rama y `npm ci`.

**Files:** Modify `backend/tests/helpers/integration/world.js` (`availability` y `appointmentId`), Create `backend/tests/integration/isolation/agenda.int.test.js`

**Interfaces:** `buildWorld` suma `PUT /availability` (franja del PT) y `POST /appointments { student_id, scheduled_at }` como PT (hora en punto, 2 días adelante) → `appointmentId`. Contrato tomado de `routes/agenda/*` y `services/agenda/*` de la #49.

| # | Actor | Request | Esperado |
|---|---|---|---|
| 106 | PT B | `PATCH /appointments/:apA { status }` | 403 |
| 107 | PT B | `POST /appointments { student_id: stA, scheduled_at }` | 403 |
| 108 | PT B | `GET /appointments?from&to` | 200 sin `apA` |
| 109 | PT B | `GET /availability` | 200 solo con la franja de B |
| 110 | alumno B | `PATCH /appointments/:apA { status }` | 403 |
| 111 | alumno B | `GET /appointments?from&to` | 200 sin `apA` |
| 112 | alumno B | `GET /availability/free?from&to` | 200 con huecos de B, ninguno de A |
| 113 | alumno A | `GET /availability`, `PUT /availability` | 403 (rol) |

- [ ] **Step 1:** Escribir el test (con control positivo: PT A y alumno A ven `apA`). `npm run test:integration -- isolation/agenda` → PASS; suite completa → PASS; `--check` → 0; `npm run lint`.
- [ ] **Step 2: Commit** `test(integration): aislamiento de disponibilidad y turnos`.

### Task 11: CI con GitHub Actions

**Files:** Create `.github/workflows/ci.yml`; Modify `CONTRIBUTING.md` (la línea "Como no hay CI, el revisor:" pasa a decir que el CI corre lint y unitarios de backend y web en cada PR y que el revisor igual corre lo afectado combinado con `develop`; la integración sigue siendo a mano)

**Interfaces:** Workflow `CI`, `on: pull_request` y `push: branches: [develop]`; dos jobs en `ubuntu-latest` con `actions/checkout@v4` y `actions/setup-node@v4` (`node-version: 22`, `cache: npm`, `cache-dependency-path` del lockfile de cada carpeta): `backend` (`working-directory: backend`: `npm ci`, `npm run lint`, `npm test`) y `frontend` (`working-directory: frontend`: `npm ci`, `npm run lint`, `npx vitest run --maxWorkers=2 --testTimeout=15000`, `npm run build`). Sin `secrets`, sin `env` de Supabase.

- [ ] **Step 1:** Escribir el workflow y el cambio de CONTRIBUTING.
- [ ] **Step 2:** Push de la rama y verificar en la PR / Actions que los dos jobs pasan (`gh run list --branch test/backend-suite`, `gh run view <id>`). Lo que falle solo en el CI de la web (timeouts) se anota para la tarjeta 25 en el cuerpo de la PR, sin tocar tests de la web.
- [ ] **Step 3: Commit** `ci: lint y tests unitarios de backend y web en cada PR`.

### Task 12: Plan de pruebas con evidencia

**Files:** Modify `docs/proceso/plan-de-pruebas.md`

- [ ] **Step 1:** Sacar lo obsoleto: `/api/session-sets` → `POST /api/sessions/:id/sets`; `substituted_exercise_id` → `original_exercise_id`; `calcularVolumenSesion()` y demás funciones que no existen → las unidades reales (`summarizeSets`, `toProgressPoints`, `computePr`, `persistSets`, `dayName`, `assertCanAccessStudent`…); IT de IA (`/api/trainer-ai`, `/api/chat`) → "pendiente (tarjeta 13)"; §3.4 "CI antes de cada merge a `main`" → el CI real (Task 11).
- [ ] **Step 2:** Columnas **Resultado** (✅/❌/⚠️) y **Evidencia** (archivo de test + fecha de corrida) en las tablas de §3.1 y §3.2; sumar los casos de §6 de la spec (Tasks 3–5, con la evidencia existente de `removeToken`) y los de integración (flujo, idempotencia, progreso, aislamiento: una fila por grupo de la tabla de Task 9/10 con la cantidad de casos y el archivo).
- [ ] **Step 3:** Sección "Corridas de integración" (fecha, commit, resultado, cantidad de tests, `--check` = 0) con la corrida de Task 13, y "Limitaciones conocidas": racha recalculada con los días asignados de hoy (`findAssignedDays`); lote de series sin transacción (Task 4); `GET /appointments` sin paginar.
- [ ] **Step 4: Commit** `docs(tests): plan de pruebas actualizado con resultados y evidencia (tarjeta 52)`.

### Task 13: Verificación final y PR

- [ ] **Step 1:** `git merge origin/develop` (si hay novedades) y desde `backend/`: `npm ci`, `npm run lint`, `npm test` → todo verde (anotar la cantidad de tests).
- [ ] **Step 2:** `npm run test:integration` contra dev → todo verde; `npm run test:integration:clean -- --check` → `QA restantes: 0`. Anotar fecha, commit y resultado en "Corridas de integración" (Task 12) y commitear.
- [ ] **Step 3:** Desde `frontend/`: `npm run lint`, `npm test` → verde (o lo que falle anotado para la tarjeta 25).
- [ ] **Step 4:** Push y PR a `develop` con `.github/pull_request_template.md`, título `test(backend): suite de pruebas unitarias, de integración y CI (tarjeta 52)`; cuerpo: tarjeta 52 + link, spec y plan, qué hace, cómo se probó (comandos y la corrida de integración), cómo correr la integración (`.env` de dev), limitaciones, y los pendientes para la 25 si los hubo. **Sin** firma de IA.
- [ ] **Step 5:** Comentario en la tarjeta 52 de Trello aclarando que la evidencia quedó en `docs/proceso/plan-de-pruebas.md` (Notion es solo lectura) y tildar su checklist al cerrar.
