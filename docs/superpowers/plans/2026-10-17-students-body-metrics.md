# Students + Body Metrics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar el módulo Students del backend (ficha, edición y baja del alumno, `last_session_at` en el listado) y agregar el historial de medidas corporales con el IMC calculado.

**Architecture:** Express ESM en capas `routes → controllers → services → repositories`, con validación previa al controller y ownership verificado en los services. Un módulo nuevo `body-metrics`, montado bajo `/students/:id/metrics`. El control de acceso al alumno vive en `services/students/student-access.service.js`, que comparten `students.service` y `body-metrics.service` sin formar un ciclo de imports.

**Tech Stack:** Node 20, Express 4, `@supabase/supabase-js` 2 (con la service_role key), Jest 29 en modo ESM (`jest.unstable_mockModule`), ESLint.

**Spec:** `docs/superpowers/specs/2026-10-17-students-body-metrics-design.md`

## Global Constraints

- Todos los paths son relativos a la raíz del repo. Los comandos `npm` se corren dentro de `backend/`.
- Los agentes no commitean, no pushean ni abren PRs. En el paso "Commit" se le pide a Igna que lo haga y se le pasa el mensaje sugerido, **sin `Co-Authored-By` ni firmas de IA**.
- Capas: `routes → controllers → services → repositories`. Toda entrada pasa por `validate(...)` antes del controller. El controller devuelve `{ data }`, salvo `GET /students`, que mantiene `{ data, meta }`.
- Ownership en los services. Un alumno ajeno o inexistente da **403** (`Errors.forbidden()`), igual que en `routines`.
- El IMC se calcula y nunca se guarda.
- `max-lines` de ESLint: 200 líneas por archivo. Comentarios en español, como el resto del código.
- No se toca `CLAUDE.md` ni `AGENTS.md`. Lo que Pablo tiene que saber va en `backend/README.md` (Task 7).
- Cualquier cambio en la base de Supabase dev, sea la migración o los datos del E2E, se aplica **después de que Igna dé el OK**.

### Ajustes al spec que hace este plan (avisar a Igna)

1. **`assertCanAccessStudent`** va en `services/students/student-access.service.js`, no en `students.service.js`. Así `body-metrics.service` lo usa sin un import circular con `students.service`, que a su vez necesita `latestForStudent` de `body-metrics.service`.
2. **`body_fat_pct`** además de no ser negativo, no puede pasar de 100.
3. **Las medidas tienen que llegar como números JSON:** `"80"` como string da 400. Se documenta en el README.
4. **`recorded_at` tiene que traer zona horaria** (`Z` o `±hh:mm`). Sin zona, la hora es ambigua y da 400.
5. **`:id` y `:metricId` se pasan a minúsculas al validarlos.** Postgres devuelve los UUID en minúsculas, y comparar contra uno en mayúsculas daría un 403 falso.

## Review Focus

1. **`recorded_at` sin zona horaria** (`"2026-10-17T10:00"`, como manda un `<input type="datetime-local">`) tiene que dar 400 y no guardarse corrido 3 h. → Task 6, test de validación.
2. **`PATCH` con solo campos desconocidos** (`{ "email": "x" }`) tiene que dar 400 "mandá al menos un campo", no un 200 sin ningún cambio. → Task 4, test de validación.
3. **Medidas enviadas como string** (`"weight_kg": "80"`, lo típico de un formulario web) tienen que dar 400 con un mensaje claro, no guardarse ni explotar. → Task 6, test de validación.
4. **Una página vacía del listado** (un entrenador sin alumnos, o una página más allá del final) no tiene que consultar la vista con `.in([])`, porque PostgREST lo rechaza y saldría un 500. → Task 4, test del service.
5. **Borrar la medida de un alumno usando la URL de otro alumno** del mismo entrenador tiene que dar 404 y no borrar nada. → Task 6, test del service.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `backend/src/database/schema.sql` | Modificar | columna `body_metrics.recorded_by` y vista `student_last_session` |
| `backend/src/database/migrations/2026-10-17-students-body-metrics.sql` | Crear | la misma migración, para correrla en Supabase dev |
| `backend/src/database/schema-checks.sql` | Modificar | chequea la columna, la vista y su `security_invoker` |
| `backend/src/database/check-anon-access.js` | Modificar | suma la vista a la lista de tablas expuestas |
| `backend/src/models/body-metrics/body-metric.model.js` | Crear | tabla, columnas, `computeBmi`, `toBodyMetric`, `withBmiHistory` |
| `backend/src/shared/utils/errors.js` | Modificar | `accountDisabled`, `metricNotFound`, `metricIdConflict` |
| `backend/src/repositories/auth/auth.repository.js` | Modificar | `revokeAllForUser` |
| `backend/src/repositories/students/students.repository.js` | Modificar | `findStudentById`, `updateStudent`, `findLastSessionDates`, columnas de listado |
| `backend/src/services/auth/auth.service.js` | Modificar | `ACCOUNT_DISABLED` en el login y el refresh |
| `backend/src/models/students/student.model.js` | Modificar | `STUDENT_LIST_COLUMNS`, `STUDENT_DETAIL_COLUMNS`, enums y nombre de la vista |
| `backend/src/services/students/student-access.service.js` | Crear | `assertCanAccessStudent` |
| `backend/src/services/students/students.service.js` | Modificar | `list` con `last_session_at`, `getById`, `update` |
| `backend/src/repositories/routines/routines.repository.js` | Modificar | `findActiveRoutineSummary` |
| `backend/src/validations/students/students.validation.js` | Modificar | `validateStudentIdParam`, `validateUpdateStudent`, `active` por defecto en `true` |
| `backend/src/controllers/students/students.controller.js` | Modificar | `getById`, `update` |
| `backend/src/routes/students/students.routes.js` | Modificar | `GET /:id`, `PATCH /:id`, monta `/:id/metrics` |
| `backend/src/repositories/body-metrics/body-metrics.repository.js` | Crear | acceso a `body_metrics` |
| `backend/src/services/body-metrics/body-metrics.service.js` | Crear | `list`, `create`, `remove`, `resolveBmi`, `latestForStudent` |
| `backend/src/validations/body-metrics/body-metrics.validation.js` | Crear | `validateCreateMetric`, `validateMetricParams` |
| `backend/src/controllers/body-metrics/body-metrics.controller.js` | Crear | `list`, `create`, `remove` |
| `backend/src/routes/body-metrics/body-metrics.routes.js` | Crear | router con `mergeParams` |
| `backend/README.md` | Modificar | endpoints y desvíos respecto del contrato, con lo que le toca a la web |
| `backend/tests/unit/...` | Crear y modificar | ver cada task |

**Orden de las tareas:** 0 (rama) → 1 (base de datos) → 2 (modelo de IMC) → 3 (errores, auth, repo de alumnos) → 4 (listado y validaciones de alumnos) → 5 (acceso, ficha y `PATCH`) → 6 (módulo de medidas) → 7 (README) → 8 (verificación y E2E).

Hay una dependencia a contrapelo del orden: la Task 5 importa `body-metrics.service`, que se crea en la Task 6. Por eso la Task 5 crea ese archivo con `latestForStudent` y `resolveBmi`, y la Task 6 lo completa.

---

### Task 0: Rama y línea de base

**Files:** ninguno.

- [ ] **Step 1: Pedirle a Igna que cree la rama** (los agentes no tocan git):

```bash
git switch develop
git switch -c feature/students-body-metrics
git merge --no-edit feature/schema-completo fix/s0-deuda-backend
```

El spec y este plan todavía no están en git, así que viajan solos a la rama nueva.

- [ ] **Step 2: Instalar dependencias.** `fix/s0-deuda-backend` cambió `package.json`.

Run: `cd backend && npm install`
Expected: termina sin errores.

- [ ] **Step 3: Confirmar que se parte de una base verde**

Run: `cd backend && npm run lint && npm test`
Expected: lint sin errores (puede haber warnings) y todos los tests en PASS. Si algo falla, se para y se le avisa a Igna antes de seguir: es una falla que viene del merge, no de esta tarjeta.

---

### Task 1: Migración de la base (columna `recorded_by` y vista `student_last_session`)

**Files:**
- Create: `backend/src/database/migrations/2026-10-17-students-body-metrics.sql`
- Modify: `backend/src/database/schema.sql` (después del índice `idx_body_metrics_student` y después del índice `idx_sessions_student`)
- Modify: `backend/src/database/schema-checks.sql` (al final)
- Modify: `backend/src/database/check-anon-access.js` (array `TABLES`)

**Interfaces:**
- Produces: columna `body_metrics.recorded_by varchar(10) not null default 'trainer'`, que solo acepta `'trainer'` o `'student'`. Vista `student_last_session (student_id uuid, last_session_at timestamptz)` con `security_invoker = true`.

- [ ] **Step 1: Crear el archivo de migración**

`backend/src/database/migrations/2026-10-17-students-body-metrics.sql`:

```sql
-- ============================================================================
-- Tarjeta 7 · Students + Body Metrics. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en schema.sql.
-- ============================================================================

-- body_metrics.recorded_by: quién cargó la medida. Define quién puede borrarla:
-- el trainer dueño borra cualquiera; el alumno, solo las que cargó él.
do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'body_metrics'
                   and column_name = 'recorded_by') then
    alter table body_metrics
      add column recorded_by varchar(10) not null default 'trainer'
      check (recorded_by in ('trainer', 'student'));
  end if;
end $$;

-- Última sesión de cada alumno, para el listado del trainer (GET /students).
-- security_invoker: la vista aplica el RLS de sessions a quien la consulta.
-- Sin esto correría con los permisos de su dueño (postgres) y la anon key
-- podría leer las fechas de sesión de cualquier alumno. El backend usa la
-- service_role, que bypasea RLS igual.
create or replace view student_last_session with (security_invoker = true) as
  select student_id, max(started_at) as last_session_at
  from sessions
  group by student_id;
```

- [ ] **Step 2: Sumar lo mismo a `schema.sql`.** El bloque `do $$ ... $$` de `recorded_by`, con su comentario, va justo después de esta línea:

```sql
create index if not exists idx_body_metrics_student on body_metrics (student_id, recorded_at desc);
```

La vista `student_last_session`, con su comentario, va justo después de esta otra:

```sql
create index if not exists idx_sessions_student on sessions (student_id, started_at desc);
```

Se usa el mismo SQL del Step 1, sin el encabezado.

- [ ] **Step 3: Sumar los chequeos al final de `schema-checks.sql`.** Primero se quita el `;` final de la última consulta; después se agrega:

```sql

union all
select 'falta la columna body_metrics.recorded_by'
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'body_metrics'
    and column_name = 'recorded_by'
)

union all
select 'falta la vista student_last_session'
where to_regclass('public.student_last_session') is null

union all
select 'la vista student_last_session debería tener security_invoker = true'
from pg_class
where oid = to_regclass('public.student_last_session')
  and not coalesce('security_invoker=true' = any (reloptions), false);
```

- [ ] **Step 4: Sumar la vista a `check-anon-access.js`.** En el array `TABLES`, después de `'notifications',`, se agrega:

```js
  // Vista (no tabla): con security_invoker hereda el RLS de sessions.
  'student_last_session',
```

- [ ] **Step 5: Aplicar en Supabase dev, con el OK de Igna**

1. Pedirle el OK a Igna y mostrarle el SQL del Step 1.
2. Aplicarlo con el MCP de Supabase (`apply_migration`, nombre `students_body_metrics`) sobre el proyecto Fit-Trainer (dev), o que Igna lo pegue en el SQL Editor.

- [ ] **Step 6: Verificar el schema**

Run: el contenido de `backend/src/database/schema-checks.sql` (con el MCP `execute_sql` o en el SQL Editor).
Expected: 0 filas.

Run: `cd backend && npm run db:check-anon`
Expected: `ok` en todas las líneas, incluida `student_last_session`, y al final "Ninguna tabla expuesta".

- [ ] **Step 7: Commit (lo hace Igna)**

```bash
git add backend/src/database
git commit -m "feat(db): body_metrics.recorded_by y vista student_last_session"
```

---

### Task 2: Modelo de medidas y cálculo del IMC

**Files:**
- Create: `backend/src/models/body-metrics/body-metric.model.js`
- Test: `backend/tests/unit/models/body-metrics/body-metric.model.test.js`

**Interfaces:**
- Produces:
  - `BODY_METRICS_TABLE: 'body_metrics'`
  - `BODY_METRIC_COLUMNS: string`
  - `MEASUREMENT_FIELDS: string[]`, con `weight_kg, height_cm, body_fat_pct, waist_cm, hip_cm, chest_cm`
  - `computeBmi(weightKg, heightCm) → number | null`
  - `toBodyMetric(row, fallbackHeightCm = null) → row & { bmi }`
  - `withBmiHistory(rowsAsc) → Array<row & { bmi }>`

- [ ] **Step 1: Escribir el test que falla**

`backend/tests/unit/models/body-metrics/body-metric.model.test.js`:

```js
import {
  computeBmi,
  toBodyMetric,
  withBmiHistory,
} from '../../../../src/models/body-metrics/body-metric.model.js';

describe('body-metric.model — computeBmi', () => {
  it('calcula peso / altura² en metros y redondea a un decimal', () => {
    // 80 / 1.8² = 24.69…
    expect(computeBmi(80, 180)).toBe(24.7);
  });

  it('acepta numéricos que llegan como string (numeric de PostgREST)', () => {
    expect(computeBmi('80', '180')).toBe(24.7);
  });

  it('devuelve null si falta el peso, falta la altura o la altura es 0', () => {
    expect(computeBmi(null, 180)).toBeNull();
    expect(computeBmi(80, null)).toBeNull();
    expect(computeBmi(80, undefined)).toBeNull();
    expect(computeBmi(80, 0)).toBeNull();
  });
});

describe('body-metric.model — toBodyMetric', () => {
  it('usa la altura propia de la medida antes que la de respaldo', () => {
    const m = toBodyMetric({ id: 'm1', weight_kg: 80, height_cm: 180 }, 160);
    expect(m).toEqual({ id: 'm1', weight_kg: 80, height_cm: 180, bmi: 24.7 });
  });

  it('usa la altura de respaldo si la medida no trae altura', () => {
    const m = toBodyMetric({ id: 'm1', weight_kg: 80, height_cm: null }, 180);
    expect(m.bmi).toBe(24.7);
    expect(m.height_cm).toBeNull(); // no inventa la altura en la fila
  });
});

describe('body-metric.model — withBmiHistory', () => {
  it('arrastra la última altura conocida hacia las medidas siguientes', () => {
    const history = withBmiHistory([
      { id: 'a', weight_kg: 82, height_cm: null }, // todavía no hay altura
      { id: 'b', weight_kg: 81, height_cm: 180 },
      { id: 'c', weight_kg: 80, height_cm: null }, // usa 180 de "b"
    ]);
    expect(history.map((m) => m.bmi)).toEqual([null, 25, 24.7]);
  });

  it('con un historial vacío devuelve []', () => {
    expect(withBmiHistory([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd backend && npm test -- tests/unit/models/body-metrics`
Expected: FAIL con "Cannot find module .../body-metric.model.js".

- [ ] **Step 3: Implementar**

`backend/src/models/body-metrics/body-metric.model.js`:

```js
/**
 * Modelo de dominio: BodyMetric (medidas corporales del alumno).
 * Estructura + helpers puros. SIN lógica de negocio ni acceso a datos.
 *
 * El IMC (bmi) se CALCULA, nunca se guarda: un valor derivado persistido
 * termina desincronizado del peso y la altura.
 */

export const BODY_METRICS_TABLE = 'body_metrics';

export const BODY_METRIC_COLUMNS =
  'id, student_id, weight_kg, height_cm, body_fat_pct, waist_cm, hip_cm, chest_cm, recorded_at, recorded_by';

/** Campos de medida que se pueden cargar (todos opcionales, al menos uno). */
export const MEASUREMENT_FIELDS = [
  'weight_kg',
  'height_cm',
  'body_fat_pct',
  'waist_cm',
  'hip_cm',
  'chest_cm',
];

const isMissing = (v) => v === null || v === undefined;

/** IMC = peso / (altura en metros)², a 1 decimal. null si no se puede calcular. */
export function computeBmi(weightKg, heightCm) {
  if (isMissing(weightKg) || isMissing(heightCm)) return null;
  const weight = Number(weightKg);
  const heightM = Number(heightCm) / 100;
  if (!Number.isFinite(weight) || !Number.isFinite(heightM) || heightM <= 0) return null;
  return Math.round((weight / heightM ** 2) * 10) / 10;
}

/**
 * Agrega `bmi` a una fila. Si la medida no trae altura usa `fallbackHeightCm`
 * (la última altura registrada antes de esa medida): nadie se mide la altura
 * cada vez que se pesa.
 */
export function toBodyMetric(row, fallbackHeightCm = null) {
  const height = isMissing(row.height_cm) ? fallbackHeightCm : row.height_cm;
  return { ...row, bmi: computeBmi(row.weight_kg, height) };
}

/** Agrega `bmi` a un historial ordenado ascendente, arrastrando la última altura. */
export function withBmiHistory(rowsAsc) {
  let lastHeight = null;
  return rowsAsc.map((row) => {
    if (!isMissing(row.height_cm)) lastHeight = row.height_cm;
    return toBodyMetric(row, lastHeight);
  });
}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd backend && npm test -- tests/unit/models/body-metrics`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit (lo hace Igna)**

```bash
git add backend/src/models/body-metrics backend/tests/unit/models/body-metrics
git commit -m "feat(body-metrics): modelo con IMC calculado"
```

---

### Task 3: Errores nuevos, revocar sesiones y `ACCOUNT_DISABLED` en auth

**Files:**
- Modify: `backend/src/shared/utils/errors.js` (objeto `Errors`)
- Modify: `backend/src/repositories/auth/auth.repository.js` (al final)
- Modify: `backend/src/repositories/students/students.repository.js` (agrega `findStudentById`)
- Modify: `backend/src/services/auth/auth.service.js` (`authenticateUser` y `refresh`)
- Test: `backend/tests/unit/services/auth/auth.service.test.js`

**Interfaces:**
- Produces:
  - `Errors.accountDisabled()` → 401 `ACCOUNT_DISABLED`
  - `Errors.metricNotFound()` → 404 `METRIC_NOT_FOUND`
  - `Errors.metricIdConflict()` → 409 `METRIC_ID_CONFLICT`
  - `authRepository.revokeAllForUser(userId: string, role: 'trainer'|'student') → Promise<void>`
  - `studentsRepository.findStudentById(id: string) → Promise<StudentDetailRow | null>`. Usa `STUDENT_PUBLIC_COLUMNS` por ahora; la Task 4 lo renombra a `STUDENT_DETAIL_COLUMNS`.

- [ ] **Step 1: Escribir los tests que fallan.** En `auth.service.test.js`:

1. En `mockRepo` se agrega `revokeAllForUser: jest.fn(),`.
2. En `mockStudentsRepo` se agrega `findStudentById: jest.fn(),`.
3. Al final del `describe('auth.service', ...)`, antes de su `});` de cierre, se agrega:

```js
  describe('alumno dado de baja (active = false)', () => {
    const studentRow = async (active) => ({
      id: 'student-1',
      trainer_id: 'trainer-1',
      name: 'Alumna',
      email: 'alumna@mail.com',
      active,
      password_hash: await hashPassword('Password1'),
    });

    it('login con la contraseña correcta → ACCOUNT_DISABLED y no emite tokens', async () => {
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
      mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValue(await studentRow(false));

      await expect(
        authService.login({ email: 'alumna@mail.com', password: 'Password1' })
      ).rejects.toMatchObject({ code: 'ACCOUNT_DISABLED', statusCode: 401 });
      expect(mockRepo.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('login con la contraseña incorrecta → INVALID_CREDENTIALS (no revela la baja)', async () => {
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
      mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValue(await studentRow(false));

      await expect(
        authService.login({ email: 'alumna@mail.com', password: 'Otra12345' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('login de una alumna reactivada (active = true) funciona', async () => {
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
      mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValue(await studentRow(true));

      const result = await authService.login({ email: 'alumna@mail.com', password: 'Password1' });
      expect(result.user.role).toBe('student');
      expect(typeof result.token).toBe('string');
    });

    const storedToken = (role) => ({
      id: 'rt-1',
      user_id: role === 'student' ? 'student-1' : 'trainer-1',
      role,
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      revoked_at: null,
    });

    it('refresh de un alumno inactivo → ACCOUNT_DISABLED', async () => {
      mockRepo.findRefreshToken.mockResolvedValue(storedToken('student'));
      mockStudentsRepo.findStudentById.mockResolvedValue({ id: 'student-1', active: false });

      await expect(authService.refresh({ refresh_token: 'tok' })).rejects.toMatchObject({
        code: 'ACCOUNT_DISABLED',
        statusCode: 401,
      });
    });

    it('refresh de un alumno activo emite un access token', async () => {
      mockRepo.findRefreshToken.mockResolvedValue(storedToken('student'));
      mockStudentsRepo.findStudentById.mockResolvedValue({ id: 'student-1', active: true });

      const result = await authService.refresh({ refresh_token: 'tok' });
      expect(verifyAccessToken(result.token).sub).toBe('student-1');
    });

    it('refresh de un trainer no consulta students', async () => {
      mockRepo.findRefreshToken.mockResolvedValue(storedToken('trainer'));

      await authService.refresh({ refresh_token: 'tok' });
      expect(mockStudentsRepo.findStudentById).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Correr los tests y ver que fallan**

Run: `cd backend && npm test -- tests/unit/services/auth`
Expected: FAIL. El primer test resuelve en lugar de rechazar, y el de "refresh de un alumno inactivo" emite un token en lugar de rechazar.

- [ ] **Step 3: Sumar los errores.** En `errors.js`, dentro de `Errors`, después de `invitationUsed`:

```js
  accountDisabled: () =>
    new AppError(401, 'ACCOUNT_DISABLED', 'Tu entrenador dio de baja tu cuenta'),
  metricNotFound: () => new AppError(404, 'METRIC_NOT_FOUND', 'La medida no existe'),
  metricIdConflict: () =>
    new AppError(409, 'METRIC_ID_CONFLICT', 'Ya existe una medida con ese id'),
```

- [ ] **Step 4: Sumar `revokeAllForUser`** al final de `auth.repository.js`:

```js
/**
 * Revoca todos los refresh tokens vigentes de un usuario (baja del alumno).
 * Ninguno de sus dispositivos puede renovar la sesión después de esto.
 */
export async function revokeAllForUser(userId, role) {
  const { error } = await supabase
    .from(REFRESH_TOKENS_TABLE)
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('role', role)
    .is('revoked_at', null);
  if (error) throw Errors.internal(error.message);
}
```

- [ ] **Step 5: Sumar `findStudentById`** a `students.repository.js`, después de `findStudentByEmailWithHash`:

```js
/** Busca un alumno por id (ficha base, sin el hash). null si no existe. */
export async function findStudentById(id) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select(STUDENT_PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}
```

- [ ] **Step 6: Rechazar al alumno inactivo en `auth.service.js`.** En `authenticateUser`, justo después de `if (!ok) throw Errors.invalidCredentials();`:

```js
  // La contraseña se verifica ANTES: con una incorrecta sigue saliendo
  // INVALID_CREDENTIALS, así no se revela que la cuenta existe y está de baja.
  if (role === 'student' && row.active === false) throw Errors.accountDisabled();
```

En `refresh`, justo después de `if (!isActive(stored)) throw ...`:

```js
  // Segunda barrera: la baja revoca los refresh tokens, pero si quedó alguno
  // vivo, un alumno inactivo igual no renueva.
  if (stored.role === 'student') {
    const student = await studentsRepository.findStudentById(stored.user_id);
    if (!student || !student.active) throw Errors.accountDisabled();
  }
```

- [ ] **Step 7: Correr los tests y ver que pasan**

Run: `cd backend && npm test -- tests/unit/services/auth`
Expected: PASS, los existentes y los 6 nuevos.

- [ ] **Step 8: Commit (lo hace Igna)**

```bash
git add backend/src/shared/utils/errors.js backend/src/repositories/auth backend/src/repositories/students backend/src/services/auth backend/tests/unit/services/auth
git commit -m "feat(auth): rechaza al alumno dado de baja (ACCOUNT_DISABLED) en login y refresh"
```

---

### Task 4: Listado con `last_session_at`, activos por defecto y validaciones de alumnos

**Files:**
- Modify: `backend/src/models/students/student.model.js`
- Modify: `backend/src/repositories/students/students.repository.js`
- Modify: `backend/src/services/students/students.service.js` (`list`)
- Modify: `backend/src/validations/students/students.validation.js`
- Test: `backend/tests/unit/services/students/students.service.test.js`
- Test: `backend/tests/unit/validations/students/students.validation.test.js` (nuevo)

**Interfaces:**
- Consumes: `findStudentById` (Task 3).
- Produces:
  - `STUDENT_LIST_COLUMNS`, `STUDENT_DETAIL_COLUMNS` (reemplaza a `STUDENT_PUBLIC_COLUMNS`, que deja de existir), `STUDENT_GOALS`, `STUDENT_LEVELS`, `STUDENT_LAST_SESSION_VIEW`
  - `studentsRepository.findLastSessionDates(studentIds: string[]) → Promise<Array<{ student_id, last_session_at }>>`
  - `studentsRepository.updateStudent(id, fields) → Promise<StudentDetailRow>`
  - `validateStudentIdParam(params) → { id }` (en minúsculas)
  - `validateUpdateStudent(body) → Partial<{ name, goal, active, birth_date, gym_equipment, injuries, level }>`
  - `validateListQuery`, que ahora devuelve `active: true` si no viene el parámetro

- [ ] **Step 1: Escribir los tests de validación que fallan**

`backend/tests/unit/validations/students/students.validation.test.js`:

```js
import {
  validateListQuery,
  validateStudentIdParam,
  validateUpdateStudent,
} from '../../../../src/validations/students/students.validation.js';

const UUID = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';

describe('students.validation — validateListQuery', () => {
  it('sin active trae solo los activos', () => {
    expect(validateListQuery({}).active).toBe(true);
  });
  it('active=false pide los dados de baja', () => {
    expect(validateListQuery({ active: 'false' }).active).toBe(false);
  });
});

describe('students.validation — validateStudentIdParam', () => {
  it('acepta un UUID y lo pasa a minúsculas', () => {
    expect(validateStudentIdParam({ id: UUID.toUpperCase() })).toEqual({ id: UUID });
  });
  it('rechaza lo que no es UUID', () => {
    expect(() => validateStudentIdParam({ id: 'abc' })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 })
    );
  });
});

describe('students.validation — validateUpdateStudent', () => {
  const invalid = (body) =>
    expect(() => validateUpdateStudent(body)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' })
    );

  it('acepta todos los campos editables y recorta textos', () => {
    expect(
      validateUpdateStudent({
        name: '  Ana Pérez ',
        goal: 'strength',
        level: 'beginner',
        active: false,
        birth_date: '1995-04-30',
        gym_equipment: [' barbell ', 'cable'],
        injuries: ' rodilla derecha ',
      })
    ).toEqual({
      name: 'Ana Pérez',
      goal: 'strength',
      level: 'beginner',
      active: false,
      birth_date: '1995-04-30',
      gym_equipment: ['barbell', 'cable'],
      injuries: 'rodilla derecha',
    });
  });

  it('acepta null para borrar birth_date, gym_equipment e injuries', () => {
    expect(validateUpdateStudent({ birth_date: null, gym_equipment: null, injuries: null })).toEqual(
      { birth_date: null, gym_equipment: null, injuries: null }
    );
  });

  it('rechaza el body vacío', () => invalid({}));
  it('rechaza un body con solo campos no editables', () => invalid({ email: 'x@y.com', trainer_id: UUID }));
  it('rechaza name de 1 caracter', () => invalid({ name: 'A' }));
  it('rechaza goal fuera del enum', () => invalid({ goal: 'cardio' }));
  it('rechaza level fuera del enum', () => invalid({ level: 'pro' }));
  it('rechaza active que no es booleano', () => invalid({ active: 'false' }));
  it('rechaza birth_date futura', () => invalid({ birth_date: '2999-01-01' }));
  it('rechaza birth_date inexistente', () => invalid({ birth_date: '2026-02-30' }));
  it('rechaza birth_date con otro formato', () => invalid({ birth_date: '30/04/1995' }));
  it('rechaza gym_equipment que no es lista', () => invalid({ gym_equipment: 'barbell' }));
  it('rechaza gym_equipment con un elemento vacío', () => invalid({ gym_equipment: ['  '] }));
  it('rechaza gym_equipment con más de 30 elementos', () =>
    invalid({ gym_equipment: Array.from({ length: 31 }, (_, i) => `e${i}`) }));
  it('rechaza injuries de más de 1000 caracteres', () => invalid({ injuries: 'x'.repeat(1001) }));
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd backend && npm test -- tests/unit/validations/students`
Expected: FAIL. `validateStudentIdParam` y `validateUpdateStudent` no existen, y `active` sale `undefined`.

- [ ] **Step 3: Actualizar el modelo.** Se reemplaza `STUDENT_PUBLIC_COLUMNS` en `student.model.js` por:

```js
/** Objetivos y niveles válidos (mismos CHECK que la tabla students). */
export const STUDENT_GOALS = ['tonify', 'weight_loss', 'hypertrophy', 'strength'];
export const STUDENT_LEVELS = ['beginner', 'intermediate', 'advanced'];

/** Vista con la última sesión de cada alumno (ver schema.sql). */
export const STUDENT_LAST_SESSION_VIEW = 'student_last_session';

/*
 * El listado y la ficha usan columnas DISTINTAS a propósito (tarjeta 7):
 * el listado necesita la última sesión, que la ficha no usa; la ficha necesita
 * gym_equipment, injuries y level (contexto de los asistentes IA del S4), que
 * el listado no muestra. Unificarlas trae de más en el listado o deja la ficha
 * sin un campo sin que nada falle a la vista. Nunca incluyen password_hash.
 */
export const STUDENT_LIST_COLUMNS = 'id, name, email, goal, active, avatar_url, created_at';

export const STUDENT_DETAIL_COLUMNS =
  'id, trainer_id, name, email, goal, birth_date, avatar_url, active, gym_equipment, injuries, level, created_at';
```

- [ ] **Step 4: Actualizar el repositorio** `students.repository.js`:

1. El import queda así:

```js
import {
  STUDENTS_TABLE,
  STUDENT_LIST_COLUMNS,
  STUDENT_DETAIL_COLUMNS,
  STUDENT_LAST_SESSION_VIEW,
} from '../../models/students/student.model.js';
```

2. En `findStudentsByTrainer`, `.select(STUDENT_PUBLIC_COLUMNS, { count: 'exact' })` pasa a `.select(STUDENT_LIST_COLUMNS, { count: 'exact' })`.
3. En `findStudentByEmailWithHash`, `createStudent` y `findStudentById`, `STUDENT_PUBLIC_COLUMNS` pasa a `STUDENT_DETAIL_COLUMNS`.
4. Al final del archivo se agrega:

```js
/** Última sesión de cada alumno pedido. Los que nunca entrenaron no vienen. */
export async function findLastSessionDates(studentIds) {
  const { data, error } = await supabase
    .from(STUDENT_LAST_SESSION_VIEW)
    .select('student_id, last_session_at')
    .in('student_id', studentIds);
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Actualiza campos del alumno y devuelve la ficha base. */
export async function updateStudent(id, fields) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .update(fields)
    .eq('id', id)
    .select(STUDENT_DETAIL_COLUMNS)
    .single();
  if (error) throw Errors.internal(error.message);
  return data;
}
```

Run: `cd backend && grep -rn "STUDENT_PUBLIC_COLUMNS" src tests`
Expected: sin resultados.

- [ ] **Step 5: Implementar las validaciones** en `students.validation.js`:

1. Debajo del import de `Errors` se agrega:

```js
import { STUDENT_GOALS, STUDENT_LEVELS } from '../../models/students/student.model.js';
```

2. Debajo de `const isString = ...` se agrega:

```js
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EQUIPMENT_ITEMS = 30;
const MAX_EQUIPMENT_LENGTH = 50;
const MAX_INJURIES_LENGTH = 1000;
```

3. En `validateListQuery`, `if (query.active !== undefined) out.active = query.active !== 'false';` se reemplaza por:

```js
  // Por defecto solo activos: un alumno dado de baja se pide con ?active=false.
  out.active = query.active === undefined ? true : query.active !== 'false';
```

4. Al final del archivo se agrega:

```js
/**
 * Valida :id de /students/:id. Lo pasa a minúsculas: Postgres devuelve los
 * UUID en minúsculas y compararlos contra uno en mayúsculas daría un 403 falso.
 */
export function validateStudentIdParam(params) {
  if (!isString(params.id) || !UUID_RE.test(params.id)) {
    throw Errors.validation('Error de validación', [{ field: 'id', message: 'id inválido' }]);
  }
  return { ...params, id: params.id.toLowerCase() };
}

/** Fecha YYYY-MM-DD que existe en el calendario y no es futura. */
function isValidPastDate(value) {
  if (!isString(value) || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  return value <= new Date().toISOString().slice(0, 10);
}

/** Valida gym_equipment: lista de textos no vacíos (o null). Devuelve el valor saneado. */
function parseEquipment(value, details) {
  if (value === null) return null;
  const ok =
    Array.isArray(value) &&
    value.length <= MAX_EQUIPMENT_ITEMS &&
    value.every(
      (item) =>
        isString(item) && item.trim() !== '' && item.trim().length <= MAX_EQUIPMENT_LENGTH
    );
  if (!ok) {
    details.push({
      field: 'gym_equipment',
      message: `gym_equipment es una lista de hasta ${MAX_EQUIPMENT_ITEMS} textos de 1 a ${MAX_EQUIPMENT_LENGTH} caracteres`,
    });
    return undefined;
  }
  return value.map((item) => item.trim());
}

/**
 * Valida el body de PATCH /students/:id. Solo toma los campos editables;
 * el resto (email, trainer_id, password_hash…) se ignora. Exige al menos uno.
 */
export function validateUpdateStudent(body) {
  const details = [];
  const out = {};

  if (body.name !== undefined) {
    const name = isString(body.name) ? body.name.trim() : '';
    if (name.length < 2 || name.length > 100) {
      details.push({ field: 'name', message: 'name debe tener entre 2 y 100 caracteres' });
    } else out.name = name;
  }
  if (body.goal !== undefined) {
    if (!STUDENT_GOALS.includes(body.goal)) {
      details.push({ field: 'goal', message: `goal debe ser uno de: ${STUDENT_GOALS.join(', ')}` });
    } else out.goal = body.goal;
  }
  if (body.level !== undefined) {
    if (!STUDENT_LEVELS.includes(body.level)) {
      details.push({ field: 'level', message: `level debe ser uno de: ${STUDENT_LEVELS.join(', ')}` });
    } else out.level = body.level;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      details.push({ field: 'active', message: 'active debe ser true o false' });
    } else out.active = body.active;
  }
  if (body.birth_date !== undefined) {
    if (body.birth_date !== null && !isValidPastDate(body.birth_date)) {
      details.push({ field: 'birth_date', message: 'birth_date debe ser una fecha YYYY-MM-DD no futura' });
    } else out.birth_date = body.birth_date;
  }
  if (body.gym_equipment !== undefined) {
    const equipment = parseEquipment(body.gym_equipment, details);
    if (equipment !== undefined) out.gym_equipment = equipment;
  }
  if (body.injuries !== undefined) {
    if (body.injuries !== null && (!isString(body.injuries) || body.injuries.length > MAX_INJURIES_LENGTH)) {
      details.push({ field: 'injuries', message: `injuries debe ser un texto de hasta ${MAX_INJURIES_LENGTH} caracteres` });
    } else out.injuries = body.injuries === null ? null : body.injuries.trim() || null;
  }

  if (details.length > 0) throw Errors.validation('Error de validación', details);
  if (Object.keys(out).length === 0) {
    throw Errors.validation('Mandá al menos un campo para actualizar', [
      { field: 'body', message: `Campos editables: name, goal, level, active, birth_date, gym_equipment, injuries` },
    ]);
  }
  return out;
}
```

- [ ] **Step 6: Correr los tests de validación**

Run: `cd backend && npm test -- tests/unit/validations/students`
Expected: PASS, 19 tests.

- [ ] **Step 7: Escribir los tests del listado que fallan.** En `students.service.test.js`:

1. En `mockStudentsRepo` se agregan `findLastSessionDates: jest.fn(),`, `findStudentById: jest.fn(),` y `updateStudent: jest.fn(),`.
2. Se reemplaza el `describe('students.service — list', ...)` completo por:

```js
describe('students.service — list', () => {
  beforeEach(() => {
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([]);
  });

  it('devuelve data + meta de paginación', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [{ id: 's1' }], total: 1 });
    const r = await service.list('trainer-1', { page: 1, limit: 20 });
    expect(r.data).toHaveLength(1);
    expect(r.meta).toEqual({ total: 1, page: 1, limit: 20, total_pages: 1 });
  });

  it('aplica defaults (solo activos, page 1, limit 20) y pasa el trainer al repo', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [], total: 0 });
    const r = await service.list('trainer-1', {});
    expect(r.meta.page).toBe(1);
    expect(r.meta.limit).toBe(20);
    expect(mockStudentsRepo.findStudentsByTrainer).toHaveBeenCalledWith(
      expect.objectContaining({ trainerId: 'trainer-1', active: true, page: 1, limit: 20 })
    );
  });

  it('con active=false pide los dados de baja', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [], total: 0 });
    await service.list('trainer-1', { active: false });
    expect(mockStudentsRepo.findStudentsByTrainer).toHaveBeenCalledWith(
      expect.objectContaining({ active: false })
    );
  });

  it('suma last_session_at a cada alumno, y null si nunca entrenó', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({
      data: [{ id: 's1' }, { id: 's2' }],
      total: 2,
    });
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([
      { student_id: 's1', last_session_at: '2026-10-15T20:00:00Z' },
    ]);

    const r = await service.list('trainer-1', {});

    expect(mockStudentsRepo.findLastSessionDates).toHaveBeenCalledWith(['s1', 's2']);
    expect(r.data).toEqual([
      { id: 's1', last_session_at: '2026-10-15T20:00:00Z' },
      { id: 's2', last_session_at: null },
    ]);
  });

  it('con la página vacía no consulta la vista (PostgREST rechaza .in([]))', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [], total: 0 });
    const r = await service.list('trainer-1', { page: 3 });
    expect(r.data).toEqual([]);
    expect(mockStudentsRepo.findLastSessionDates).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Correr y ver que falla**

Run: `cd backend && npm test -- tests/unit/services/students`
Expected: FAIL en "aplica defaults" (`active` llega `undefined`) y en "suma last_session_at".

- [ ] **Step 9: Implementar `list`.** En `students.service.js` se reemplaza la función `list`:

```js
/**
 * Lista los alumnos del trainer (GET /students) con la fecha de su última
 * sesión. Por defecto solo activos. La última sesión sale de una segunda
 * consulta a la vista student_last_session (ver student.model.js).
 */
export async function list(trainerId, { active = true, search, page = 1, limit = 20 } = {}) {
  const { data: rows, total } = await studentsRepo.findStudentsByTrainer({
    trainerId,
    active,
    search,
    page,
    limit,
  });

  // .in('student_id', []) es inválido en PostgREST: con la página vacía no se consulta.
  const lastSessions = rows.length
    ? await studentsRepo.findLastSessionDates(rows.map((s) => s.id))
    : [];
  const lastByStudent = new Map(lastSessions.map((r) => [r.student_id, r.last_session_at]));

  return {
    data: rows.map((s) => ({ ...s, last_session_at: lastByStudent.get(s.id) ?? null })),
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
}
```

- [ ] **Step 10: Correr los tests del módulo y el lint**

Run: `cd backend && npm test -- tests/unit/services/students tests/unit/validations/students tests/unit/services/auth && npm run lint`
Expected: PASS y lint sin errores.

- [ ] **Step 11: Commit (lo hace Igna)**

```bash
git add backend/src/models/students backend/src/repositories/students backend/src/services/students backend/src/validations/students backend/tests/unit/services/students backend/tests/unit/validations/students
git commit -m "feat(students): listado con last_session_at y solo activos por defecto; validaciones de ficha"
```

---

### Task 5: Control de acceso, ficha (`GET /students/:id`) y edición y baja (`PATCH /students/:id`)

**Files:**
- Create: `backend/src/services/students/student-access.service.js`
- Create: `backend/src/services/body-metrics/body-metrics.service.js` (solo `resolveBmi` y `latestForStudent`; la Task 6 lo completa)
- Create: `backend/src/repositories/body-metrics/body-metrics.repository.js` (solo `findLatestMetric` y `findLatestHeightCm`; la Task 6 lo completa)
- Modify: `backend/src/repositories/routines/routines.repository.js` (agrega `findActiveRoutineSummary`)
- Modify: `backend/src/services/students/students.service.js` (agrega `getById` y `update`)
- Modify: `backend/src/controllers/students/students.controller.js`
- Modify: `backend/src/routes/students/students.routes.js`
- Test: `backend/tests/unit/services/students/student-access.service.test.js` (nuevo)
- Test: `backend/tests/unit/services/students/students.service.test.js`

**Interfaces:**
- Consumes:
  - `findStudentById`, `updateStudent` (Tasks 3 y 4)
  - `revokeAllForUser` (Task 3)
  - `toBodyMetric`, `BODY_METRICS_TABLE`, `BODY_METRIC_COLUMNS` (Task 2)
  - `validateStudentIdParam`, `validateUpdateStudent` (Task 4)
- Produces:
  - `assertCanAccessStudent(user: { id, role }, studentId) → Promise<StudentDetailRow>`. Lanza 403.
  - `bodyMetricsService.resolveBmi(row) → Promise<row & { bmi }>`
  - `bodyMetricsService.latestForStudent(studentId) → Promise<(row & { bmi }) | null>`
  - `bodyMetricsRepository.findLatestMetric(studentId) → Promise<row | null>`
  - `bodyMetricsRepository.findLatestHeightCm(studentId, atOrBefore: string) → Promise<number | null>`
  - `routinesRepository.findActiveRoutineSummary(studentId) → Promise<{ id, name, days } | null>`
  - `studentsService.getById(user, studentId) → Promise<StudentDetail>`
  - `studentsService.update(user, studentId, fields) → Promise<StudentDetail>`
  - `StudentDetail = StudentDetailRow & { latest_metrics, active_routine }`

- [ ] **Step 1: Escribir los tests de acceso que fallan**

`backend/tests/unit/services/students/student-access.service.test.js`:

```js
import { jest } from '@jest/globals';

const mockStudentsRepo = { findStudentById: jest.fn() };
jest.unstable_mockModule(
  '../../../../src/repositories/students/students.repository.js',
  () => mockStudentsRepo
);

const { assertCanAccessStudent } = await import(
  '../../../../src/services/students/student-access.service.js'
);

const STUDENT = { id: 'student-1', trainer_id: 'trainer-1', name: 'Ana', active: true };
const forbidden = expect.objectContaining({ code: 'FORBIDDEN', statusCode: 403 });

describe('student-access.service — assertCanAccessStudent', () => {
  it('el trainer dueño accede y recibe la fila del alumno', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    await expect(
      assertCanAccessStudent({ id: 'trainer-1', role: 'trainer' }, 'student-1')
    ).resolves.toEqual(STUDENT);
  });

  it('el propio alumno accede', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    await expect(
      assertCanAccessStudent({ id: 'student-1', role: 'student' }, 'student-1')
    ).resolves.toEqual(STUDENT);
  });

  it('otro trainer → 403', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    await expect(
      assertCanAccessStudent({ id: 'trainer-2', role: 'trainer' }, 'student-1')
    ).rejects.toEqual(forbidden);
  });

  it('otro alumno → 403 sin consultar la base', async () => {
    await expect(
      assertCanAccessStudent({ id: 'student-2', role: 'student' }, 'student-1')
    ).rejects.toEqual(forbidden);
    expect(mockStudentsRepo.findStudentById).not.toHaveBeenCalled();
  });

  it('alumno inexistente → 403 (no revela qué ids existen)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(null);
    await expect(
      assertCanAccessStudent({ id: 'trainer-1', role: 'trainer' }, 'student-x')
    ).rejects.toEqual(forbidden);
  });

  it('un rol desconocido → 403', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    await expect(
      assertCanAccessStudent({ id: 'x', role: 'admin' }, 'student-1')
    ).rejects.toEqual(forbidden);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd backend && npm test -- tests/unit/services/students/student-access`
Expected: FAIL con "Cannot find module .../student-access.service.js".

- [ ] **Step 3: Implementar el control de acceso**

`backend/src/services/students/student-access.service.js`:

```js
import { Errors } from '../../shared/utils/errors.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';

/**
 * Verifica que `user` pueda ver o tocar al alumno `studentId` y devuelve su
 * fila (ficha base). Es el único chequeo de ownership de /students/:id y
 * /students/:id/metrics (el backend usa la service_role: el RLS no aplica).
 *   - trainer: el alumno tiene que ser suyo.
 *   - student: solo él mismo.
 * Ajeno o inexistente → 403 en los dos casos, como routines: no revela qué
 * ids existen.
 */
export async function assertCanAccessStudent(user, studentId) {
  if (user.role === 'student' && user.id !== studentId) throw Errors.forbidden();
  if (user.role !== 'student' && user.role !== 'trainer') throw Errors.forbidden();

  const student = await studentsRepo.findStudentById(studentId);
  if (!student) throw Errors.forbidden();
  if (user.role === 'trainer' && student.trainer_id !== user.id) throw Errors.forbidden();
  return student;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd backend && npm test -- tests/unit/services/students/student-access`
Expected: PASS, 6 tests.

- [ ] **Step 5: Crear el repositorio de medidas** (lectura de la última medida)

`backend/src/repositories/body-metrics/body-metrics.repository.js`:

```js
import { supabase } from '../../shared/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import {
  BODY_METRICS_TABLE,
  BODY_METRIC_COLUMNS,
} from '../../models/body-metrics/body-metric.model.js';

/** Medida más reciente del alumno, o null si no tiene ninguna. */
export async function findLatestMetric(studentId) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .select(BODY_METRIC_COLUMNS)
    .eq('student_id', studentId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Última altura registrada en o antes de `atOrBefore` (para el IMC), o null. */
export async function findLatestHeightCm(studentId, atOrBefore) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .select('height_cm')
    .eq('student_id', studentId)
    .not('height_cm', 'is', null)
    .lte('recorded_at', atOrBefore)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data?.height_cm ?? null;
}
```

- [ ] **Step 6: Crear el service de medidas** (por ahora, solo lo que usa la ficha)

`backend/src/services/body-metrics/body-metrics.service.js`:

```js
import * as bodyMetricsRepo from '../../repositories/body-metrics/body-metrics.repository.js';
import { toBodyMetric } from '../../models/body-metrics/body-metric.model.js';

/**
 * Agrega el IMC a una medida. Si no trae altura usa la última registrada en o
 * antes de su recorded_at (una consulta más solo en ese caso).
 */
export async function resolveBmi(row) {
  const fallbackHeight =
    row.height_cm ?? (await bodyMetricsRepo.findLatestHeightCm(row.student_id, row.recorded_at));
  return toBodyMetric(row, fallbackHeight);
}

/** Medida más reciente del alumno con IMC, o null (latest_metrics de la ficha). */
export async function latestForStudent(studentId) {
  const latest = await bodyMetricsRepo.findLatestMetric(studentId);
  return latest ? resolveBmi(latest) : null;
}
```

- [ ] **Step 7: Sumar `findActiveRoutineSummary`** a `routines.repository.js`, después de `findActiveRoutineForStudentToday`:

```js
/** Rutina activa más reciente del alumno, sin ejercicios (active_routine de la ficha). */
export async function findActiveRoutineSummary(studentId) {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .select('id, name, days')
    .eq('student_id', studentId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}
```

- [ ] **Step 8: Escribir los tests de ficha y edición que fallan.** En `students.service.test.js`:

1. Después de los `jest.unstable_mockModule` que ya están (y antes del `await import` del service), se agregan estos mocks. `student-access.service` queda real y usa el `mockStudentsRepo`.

```js
const mockAuthRepo = { revokeAllForUser: jest.fn() };
const mockRoutinesRepo = { findActiveRoutineSummary: jest.fn() };
const mockBodyMetricsService = { latestForStudent: jest.fn() };

jest.unstable_mockModule(
  '../../../../src/repositories/auth/auth.repository.js',
  () => mockAuthRepo
);
jest.unstable_mockModule(
  '../../../../src/repositories/routines/routines.repository.js',
  () => mockRoutinesRepo
);
jest.unstable_mockModule(
  '../../../../src/services/body-metrics/body-metrics.service.js',
  () => mockBodyMetricsService
);
```

2. Al final del archivo se agrega:

```js
const TRAINER = { id: 'trainer-1', role: 'trainer' };
const STUDENT_ROW = {
  id: 'student-1',
  trainer_id: 'trainer-1',
  name: 'Ana',
  active: true,
  gym_equipment: ['barbell'],
  injuries: null,
  level: 'beginner',
};
const LATEST = { id: 'm1', weight_kg: 60, height_cm: 165, bmi: 22 };
const ROUTINE = { id: 'r1', name: 'Fuerza 3 días', days: ['monday', 'wednesday', 'friday'] };

describe('students.service — getById', () => {
  it('devuelve la ficha con latest_metrics y active_routine', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockBodyMetricsService.latestForStudent.mockResolvedValue(LATEST);
    mockRoutinesRepo.findActiveRoutineSummary.mockResolvedValue(ROUTINE);

    const detail = await service.getById(TRAINER, 'student-1');

    expect(detail).toEqual({ ...STUDENT_ROW, latest_metrics: LATEST, active_routine: ROUTINE });
    expect(mockBodyMetricsService.latestForStudent).toHaveBeenCalledWith('student-1');
  });

  it('sin medidas ni rutina devuelve null en los dos', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockBodyMetricsService.latestForStudent.mockResolvedValue(null);
    mockRoutinesRepo.findActiveRoutineSummary.mockResolvedValue(null);

    const detail = await service.getById({ id: 'student-1', role: 'student' }, 'student-1');
    expect(detail.latest_metrics).toBeNull();
    expect(detail.active_routine).toBeNull();
  });

  it('el alumno de otro trainer → 403', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    await expect(
      service.getById({ id: 'trainer-2', role: 'trainer' }, 'student-1')
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('students.service — update', () => {
  beforeEach(() => {
    mockBodyMetricsService.latestForStudent.mockResolvedValue(null);
    mockRoutinesRepo.findActiveRoutineSummary.mockResolvedValue(null);
  });

  it('actualiza y devuelve la ficha completa', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...STUDENT_ROW, level: 'advanced' });

    const detail = await service.update(TRAINER, 'student-1', { level: 'advanced' });

    expect(mockStudentsRepo.updateStudent).toHaveBeenCalledWith('student-1', { level: 'advanced' });
    expect(detail).toMatchObject({ level: 'advanced', latest_metrics: null, active_routine: null });
    expect(mockAuthRepo.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('dar de baja a un alumno activo revoca sus sesiones', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...STUDENT_ROW, active: false });

    await service.update(TRAINER, 'student-1', { active: false });

    expect(mockAuthRepo.revokeAllForUser).toHaveBeenCalledWith('student-1', 'student');
  });

  it('un alumno que ya estaba de baja no vuelve a revocar', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT_ROW, active: false });
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...STUDENT_ROW, active: false });

    await service.update(TRAINER, 'student-1', { active: false });

    expect(mockAuthRepo.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('reactivar no revoca nada', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT_ROW, active: false });
    mockStudentsRepo.updateStudent.mockResolvedValue(STUDENT_ROW);

    await service.update(TRAINER, 'student-1', { active: true });

    expect(mockAuthRepo.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('el propio alumno no puede editarse → 403 y no toca la base', async () => {
    await expect(
      service.update({ id: 'student-1', role: 'student' }, 'student-1', { level: 'advanced' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
  });

  it('otro trainer → 403 y no toca la base', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    await expect(
      service.update({ id: 'trainer-2', role: 'trainer' }, 'student-1', { name: 'X' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 9: Correr y ver que falla**

Run: `cd backend && npm test -- tests/unit/services/students/students.service`
Expected: FAIL con "service.getById is not a function".

- [ ] **Step 10: Implementar `getById` y `update`** en `students.service.js`:

1. Debajo de los imports que ya están se agregan:

```js
import * as authRepo from '../../repositories/auth/auth.repository.js';
import * as routinesRepo from '../../repositories/routines/routines.repository.js';
import { latestForStudent } from '../body-metrics/body-metrics.service.js';
import { assertCanAccessStudent } from './student-access.service.js';
```

2. Debajo de `list` se agrega:

```js
/** Arma la ficha: fila del alumno + última medida (con IMC) + rutina activa. */
async function buildDetail(student) {
  const [latestMetrics, activeRoutine] = await Promise.all([
    latestForStudent(student.id),
    routinesRepo.findActiveRoutineSummary(student.id),
  ]);
  return { ...student, latest_metrics: latestMetrics, active_routine: activeRoutine };
}

/** GET /students/:id — ficha completa. Trainer dueño o el propio alumno. */
export async function getById(user, studentId) {
  const student = await assertCanAccessStudent(user, studentId);
  return buildDetail(student);
}

/**
 * PATCH /students/:id — solo el trainer dueño. Si el alumno pasa de activo a
 * dado de baja, se revocan sus refresh tokens: no puede renovar la sesión. El
 * access token que tenga en la mano vive hasta JWT_EXPIRES_IN (1 h).
 */
export async function update(user, studentId, fields) {
  if (user.role !== 'trainer') throw Errors.forbidden();
  const current = await assertCanAccessStudent(user, studentId);

  const updated = await studentsRepo.updateStudent(studentId, fields);
  if (current.active && fields.active === false) {
    await authRepo.revokeAllForUser(studentId, 'student');
  }
  return buildDetail(updated);
}
```

- [ ] **Step 11: Sumar los controllers** al final de `students.controller.js`:

```js
/** GET /students/:id — ficha completa (trainer dueño o el propio alumno). */
export const getById = asyncHandler(async (req, res) => {
  const data = await studentsService.getById(req.user, req.params.id);
  res.json({ data });
});

/** PATCH /students/:id — edita o da de baja al alumno (solo trainer dueño). */
export const update = asyncHandler(async (req, res) => {
  const data = await studentsService.update(req.user, req.params.id, req.body);
  res.json({ data });
});
```

- [ ] **Step 12: Sumar las rutas** en `students.routes.js`:

1. El import de validaciones queda así:

```js
import {
  validateRegisterFromInvitation,
  validateListQuery,
  validateStudentIdParam,
  validateUpdateStudent,
} from '../../validations/students/students.validation.js';
```

2. Antes de `export default router;` se agrega:

```js
// Ficha: trainer dueño o el propio alumno (el ownership se valida en el service).
router.get(
  '/:id',
  authenticate,
  requireRole('trainer', 'student'),
  validate(validateStudentIdParam, 'params'),
  studentsController.getById
);

// Edición y baja: solo trainer (dueño, verificado en el service).
router.patch(
  '/:id',
  authenticate,
  requireRole('trainer'),
  validate(validateStudentIdParam, 'params'),
  validate(validateUpdateStudent),
  studentsController.update
);
```

- [ ] **Step 13: Correr el módulo y el lint**

Run: `cd backend && npm test -- tests/unit/services/students && npm run lint`
Expected: PASS y lint sin errores.

- [ ] **Step 14: Commit (lo hace Igna)**

```bash
git add backend/src/services backend/src/repositories backend/src/controllers/students backend/src/routes/students backend/tests/unit/services/students
git commit -m "feat(students): ficha del alumno y edición/baja con revocación de sesiones"
```

---

### Task 6: Módulo de medidas (`/students/:id/metrics`)

**Files:**
- Modify: `backend/src/repositories/body-metrics/body-metrics.repository.js` (agrega 4 funciones)
- Modify: `backend/src/services/body-metrics/body-metrics.service.js` (agrega `list`, `create`, `remove`)
- Create: `backend/src/validations/body-metrics/body-metrics.validation.js`
- Create: `backend/src/controllers/body-metrics/body-metrics.controller.js`
- Create: `backend/src/routes/body-metrics/body-metrics.routes.js`
- Modify: `backend/src/routes/students/students.routes.js` (monta el router)
- Test: `backend/tests/unit/validations/body-metrics/body-metrics.validation.test.js` (nuevo)
- Test: `backend/tests/unit/services/body-metrics/body-metrics.service.test.js` (nuevo)

**Interfaces:**
- Consumes:
  - `assertCanAccessStudent` (Task 5)
  - `resolveBmi` y `latestForStudent` (Task 5, mismo archivo)
  - `withBmiHistory`, `MEASUREMENT_FIELDS` (Task 2)
  - `Errors.metricNotFound`, `Errors.metricIdConflict` (Task 3)
  - `validateStudentIdParam` (Task 4)
- Produces:
  - `bodyMetricsService.list(user, studentId) → Promise<BodyMetric[]>`
  - `bodyMetricsService.create(user, studentId, fields) → Promise<{ metric, created: boolean }>`
  - `bodyMetricsService.remove(user, studentId, metricId) → Promise<void>`
  - `validateCreateMetric(body)`, `validateMetricParams(params) → { id, metricId }`

- [ ] **Step 1: Escribir los tests de validación que fallan**

`backend/tests/unit/validations/body-metrics/body-metrics.validation.test.js`:

```js
import {
  validateCreateMetric,
  validateMetricParams,
} from '../../../../src/validations/body-metrics/body-metrics.validation.js';

const UUID = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const invalid = (body) =>
  expect(() => validateCreateMetric(body)).toThrow(
    expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 })
  );

describe('body-metrics.validation — validateCreateMetric', () => {
  it('acepta todas las medidas, el id y recorded_at; ignora campos desconocidos', () => {
    expect(
      validateCreateMetric({
        id: UUID.toUpperCase(),
        weight_kg: 80.5,
        height_cm: 180,
        body_fat_pct: 18,
        waist_cm: 85,
        hip_cm: 98,
        chest_cm: 102,
        recorded_at: '2026-10-01T09:30:00-03:00',
        recorded_by: 'trainer', // lo pone el backend, nunca el cliente
        bmi: 99, // derivado: nunca se acepta del cliente
      })
    ).toEqual({
      id: UUID,
      weight_kg: 80.5,
      height_cm: 180,
      body_fat_pct: 18,
      waist_cm: 85,
      hip_cm: 98,
      chest_cm: 102,
      recorded_at: '2026-10-01T12:30:00.000Z',
    });
  });

  it('con una sola medida alcanza', () => {
    expect(validateCreateMetric({ weight_kg: 70 })).toEqual({ weight_kg: 70 });
  });

  it('trata null como ausente', () => {
    expect(validateCreateMetric({ weight_kg: 70, height_cm: null })).toEqual({ weight_kg: 70 });
  });

  it('rechaza el body sin ninguna medida', () => invalid({ recorded_at: '2026-10-17T12:00:00Z' }));
  it('rechaza el body vacío', () => invalid({}));
  it('rechaza medidas negativas', () => invalid({ weight_kg: -1 }));
  it('rechaza medidas enviadas como string', () => invalid({ weight_kg: '80' }));
  it('rechaza NaN o Infinity', () => invalid({ weight_kg: Number.POSITIVE_INFINITY }));
  it('rechaza body_fat_pct mayor a 100', () => invalid({ body_fat_pct: 101 }));
  it('rechaza un id que no es UUID', () => invalid({ id: 'abc', weight_kg: 70 }));
  it('rechaza recorded_at sin zona horaria', () =>
    invalid({ weight_kg: 70, recorded_at: '2026-10-17T10:00' }));
  it('rechaza recorded_at que no es fecha', () => invalid({ weight_kg: 70, recorded_at: 'ayer' }));
  it('rechaza recorded_at más de 5 minutos en el futuro', () =>
    invalid({ weight_kg: 70, recorded_at: new Date(Date.now() + 10 * 60_000).toISOString() }));
  it('tolera hasta 5 minutos de reloj adelantado', () => {
    const at = new Date(Date.now() + 3 * 60_000).toISOString();
    expect(validateCreateMetric({ weight_kg: 70, recorded_at: at }).recorded_at).toBe(at);
  });
});

describe('body-metrics.validation — validateMetricParams', () => {
  it('acepta los dos UUID y los pasa a minúsculas', () => {
    expect(validateMetricParams({ id: UUID.toUpperCase(), metricId: UUID })).toEqual({
      id: UUID,
      metricId: UUID,
    });
  });
  it('rechaza metricId inválido', () => {
    expect(() => validateMetricParams({ id: UUID, metricId: 'x' })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' })
    );
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd backend && npm test -- tests/unit/validations/body-metrics`
Expected: FAIL con "Cannot find module .../body-metrics.validation.js".

- [ ] **Step 3: Implementar las validaciones**

`backend/src/validations/body-metrics/body-metrics.validation.js`:

```js
import { Errors } from '../../shared/utils/errors.js';
import { MEASUREMENT_FIELDS } from '../../models/body-metrics/body-metric.model.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// ISO 8601 con zona obligatoria: "10:00" sin zona no dice en qué país se midió.
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;
// Tolerancia al reloj adelantado del celular.
const MAX_CLOCK_SKEW_MS = 5 * 60_000;

const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

/** Valida una medida; devuelve el número o undefined (y anota el error). */
function parseMeasurement(field, value, details) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    details.push({ field, message: `${field} debe ser un número mayor o igual a 0` });
    return undefined;
  }
  if (field === 'body_fat_pct' && value > 100) {
    details.push({ field, message: 'body_fat_pct no puede superar 100' });
    return undefined;
  }
  return value;
}

/** Valida recorded_at; devuelve el ISO normalizado o undefined (y anota el error). */
function parseRecordedAt(value, details) {
  const time = typeof value === 'string' && ISO_DATETIME_RE.test(value) ? Date.parse(value) : NaN;
  if (Number.isNaN(time)) {
    details.push({
      field: 'recorded_at',
      message: 'recorded_at debe ser fecha y hora ISO 8601 con zona (ej. 2026-10-17T09:30:00-03:00)',
    });
    return undefined;
  }
  if (time > Date.now() + MAX_CLOCK_SKEW_MS) {
    details.push({ field: 'recorded_at', message: 'recorded_at no puede ser futuro' });
    return undefined;
  }
  return new Date(time).toISOString();
}

/**
 * Valida el body de POST /students/:id/metrics. `id` es opcional y lo genera
 * el cliente (offline-first: reintentar no duplica). `recorded_by` y `bmi`
 * nunca se aceptan del cliente.
 */
export function validateCreateMetric(body) {
  const details = [];
  const out = {};

  if (body.id !== undefined) {
    if (!isUuid(body.id)) details.push({ field: 'id', message: 'id debe ser un UUID' });
    else out.id = body.id.toLowerCase();
  }
  for (const field of MEASUREMENT_FIELDS) {
    if (body[field] === undefined || body[field] === null) continue;
    const value = parseMeasurement(field, body[field], details);
    if (value !== undefined) out[field] = value;
  }
  if (body.recorded_at !== undefined) {
    const recordedAt = parseRecordedAt(body.recorded_at, details);
    if (recordedAt !== undefined) out.recorded_at = recordedAt;
  }

  if (details.length > 0) throw Errors.validation('Error de validación', details);
  if (!MEASUREMENT_FIELDS.some((f) => out[f] !== undefined)) {
    throw Errors.validation('Cargá al menos una medida', [
      { field: 'body', message: `Medidas posibles: ${MEASUREMENT_FIELDS.join(', ')}` },
    ]);
  }
  return out;
}

/** Valida :id y :metricId de DELETE /students/:id/metrics/:metricId (en minúsculas). */
export function validateMetricParams(params) {
  const details = [];
  if (!isUuid(params.id)) details.push({ field: 'id', message: 'id inválido' });
  if (!isUuid(params.metricId)) details.push({ field: 'metricId', message: 'metricId inválido' });
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return { id: params.id.toLowerCase(), metricId: params.metricId.toLowerCase() };
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd backend && npm test -- tests/unit/validations/body-metrics`
Expected: PASS, 16 tests.

- [ ] **Step 5: Escribir los tests del service que fallan**

`backend/tests/unit/services/body-metrics/body-metrics.service.test.js`:

```js
import { jest } from '@jest/globals';

const mockRepo = {
  findMetricsByStudent: jest.fn(),
  findLatestMetric: jest.fn(),
  findLatestHeightCm: jest.fn(),
  insertMetric: jest.fn(),
  findMetricById: jest.fn(),
  deleteMetric: jest.fn(),
};
const mockAccess = { assertCanAccessStudent: jest.fn() };

jest.unstable_mockModule(
  '../../../../src/repositories/body-metrics/body-metrics.repository.js',
  () => mockRepo
);
jest.unstable_mockModule(
  '../../../../src/services/students/student-access.service.js',
  () => mockAccess
);

const service = await import('../../../../src/services/body-metrics/body-metrics.service.js');

const TRAINER = { id: 'trainer-1', role: 'trainer' };
const STUDENT = { id: 'student-1', role: 'student' };
const metric = (over = {}) => ({
  id: 'm1',
  student_id: 'student-1',
  weight_kg: 80,
  height_cm: 180,
  recorded_at: '2026-10-10T12:00:00.000Z',
  recorded_by: 'trainer',
  ...over,
});

beforeEach(() => {
  mockAccess.assertCanAccessStudent.mockResolvedValue({ id: 'student-1' });
});

describe('body-metrics.service — list', () => {
  it('verifica el acceso y devuelve el historial con IMC, arrastrando la altura', async () => {
    mockRepo.findMetricsByStudent.mockResolvedValue([
      metric({ id: 'a', recorded_at: '2026-10-01T12:00:00Z' }),
      metric({ id: 'b', weight_kg: 78, height_cm: null, recorded_at: '2026-10-08T12:00:00Z' }),
      metric({ id: 'c', weight_kg: 77, height_cm: null, recorded_at: '2026-10-15T12:00:00Z' }),
    ]);

    const data = await service.list(TRAINER, 'student-1');

    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(TRAINER, 'student-1');
    expect(data.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(data.map((m) => m.bmi)).toEqual([24.7, 24.1, 23.8]);
  });

  it('sin acceso → 403 y no lee medidas', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'FORBIDDEN', statusCode: 403 })
    );
    await expect(service.list(TRAINER, 'student-1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockRepo.findMetricsByStudent).not.toHaveBeenCalled();
  });
});

describe('body-metrics.service — create', () => {
  it('el trainer carga → recorded_by trainer, created true, con IMC', async () => {
    mockRepo.insertMetric.mockImplementation(async (row) => metric({ ...row, id: 'new' }));

    const r = await service.create(TRAINER, 'student-1', { weight_kg: 80, height_cm: 180 });

    expect(mockRepo.insertMetric).toHaveBeenCalledWith({
      weight_kg: 80,
      height_cm: 180,
      student_id: 'student-1',
      recorded_by: 'trainer',
    });
    expect(r.created).toBe(true);
    expect(r.metric.bmi).toBe(24.7);
  });

  it('el alumno carga → recorded_by student', async () => {
    mockRepo.insertMetric.mockImplementation(async (row) => metric({ ...row }));
    await service.create(STUDENT, 'student-1', { weight_kg: 80 });
    expect(mockRepo.insertMetric).toHaveBeenCalledWith(
      expect.objectContaining({ recorded_by: 'student' })
    );
  });

  it('sin altura, el IMC usa la última altura previa', async () => {
    mockRepo.insertMetric.mockResolvedValue(metric({ height_cm: null }));
    mockRepo.findLatestHeightCm.mockResolvedValue(180);

    const r = await service.create(TRAINER, 'student-1', { weight_kg: 80 });

    expect(mockRepo.findLatestHeightCm).toHaveBeenCalledWith('student-1', '2026-10-10T12:00:00.000Z');
    expect(r.metric.bmi).toBe(24.7);
  });

  it('reintento con el mismo id del mismo alumno → created false y la fila guardada', async () => {
    mockRepo.insertMetric.mockResolvedValue(null); // 23505: el id ya existe
    mockRepo.findMetricById.mockResolvedValue(metric({ id: 'dup' }));

    const r = await service.create(STUDENT, 'student-1', { id: 'dup', weight_kg: 80 });

    expect(mockRepo.findMetricById).toHaveBeenCalledWith('dup');
    expect(r.created).toBe(false);
    expect(r.metric.id).toBe('dup');
  });

  it('el mismo id pero de otro alumno → 409 METRIC_ID_CONFLICT', async () => {
    mockRepo.insertMetric.mockResolvedValue(null);
    mockRepo.findMetricById.mockResolvedValue(metric({ id: 'dup', student_id: 'student-2' }));

    await expect(
      service.create(TRAINER, 'student-1', { id: 'dup', weight_kg: 80 })
    ).rejects.toMatchObject({ code: 'METRIC_ID_CONFLICT', statusCode: 409 });
  });

  it('sin acceso → 403 y no inserta', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'FORBIDDEN', statusCode: 403 })
    );
    await expect(service.create(TRAINER, 'student-1', { weight_kg: 80 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockRepo.insertMetric).not.toHaveBeenCalled();
  });
});

describe('body-metrics.service — remove', () => {
  it('el trainer dueño borra una medida que cargó el alumno', async () => {
    mockRepo.findMetricById.mockResolvedValue(metric({ recorded_by: 'student' }));
    await service.remove(TRAINER, 'student-1', 'm1');
    expect(mockRepo.deleteMetric).toHaveBeenCalledWith('m1');
  });

  it('el alumno borra una que cargó él', async () => {
    mockRepo.findMetricById.mockResolvedValue(metric({ recorded_by: 'student' }));
    await service.remove(STUDENT, 'student-1', 'm1');
    expect(mockRepo.deleteMetric).toHaveBeenCalledWith('m1');
  });

  it('el alumno no puede borrar una que cargó el trainer → 403', async () => {
    mockRepo.findMetricById.mockResolvedValue(metric({ recorded_by: 'trainer' }));
    await expect(service.remove(STUDENT, 'student-1', 'm1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockRepo.deleteMetric).not.toHaveBeenCalled();
  });

  it('una medida inexistente → 404', async () => {
    mockRepo.findMetricById.mockResolvedValue(null);
    await expect(service.remove(TRAINER, 'student-1', 'm1')).rejects.toMatchObject({
      code: 'METRIC_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('una medida de otro alumno, pedida por la URL de este → 404 y no borra', async () => {
    mockRepo.findMetricById.mockResolvedValue(metric({ student_id: 'student-2' }));
    await expect(service.remove(TRAINER, 'student-1', 'm1')).rejects.toMatchObject({
      code: 'METRIC_NOT_FOUND',
    });
    expect(mockRepo.deleteMetric).not.toHaveBeenCalled();
  });
});

describe('body-metrics.service — latestForStudent', () => {
  it('sin medidas → null', async () => {
    mockRepo.findLatestMetric.mockResolvedValue(null);
    await expect(service.latestForStudent('student-1')).resolves.toBeNull();
  });

  it('con la última medida sin altura, usa la altura previa', async () => {
    mockRepo.findLatestMetric.mockResolvedValue(metric({ height_cm: null }));
    mockRepo.findLatestHeightCm.mockResolvedValue(180);
    const latest = await service.latestForStudent('student-1');
    expect(latest.bmi).toBe(24.7);
  });
});
```

Los IMC esperados en `list`: 80/3.24 = 24.69 → 24.7; 78/3.24 = 24.07 → 24.1; 77/3.24 = 23.77 → 23.8.

- [ ] **Step 6: Correr y ver que falla**

Run: `cd backend && npm test -- tests/unit/services/body-metrics`
Expected: FAIL con "service.list is not a function". Los tests de `latestForStudent` ya pasan.

- [ ] **Step 7: Completar el repositorio.** Al final de `body-metrics.repository.js`:

```js
/** Historial del alumno, de la medida más vieja a la más nueva (orden de los gráficos). */
export async function findMetricsByStudent(studentId) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .select(BODY_METRIC_COLUMNS)
    .eq('student_id', studentId)
    .order('recorded_at', { ascending: true });
  if (error) throw Errors.internal(error.message);
  return data;
}

/**
 * Inserta una medida. Devuelve null si el id (generado en el cliente) ya
 * existe (23505): es un reintento y el service resuelve qué responder.
 */
export async function insertMetric(fields) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .insert(fields)
    .select(BODY_METRIC_COLUMNS)
    .single();
  if (error && error.code === '23505') return null;
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Busca una medida por id, o null. */
export async function findMetricById(id) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .select(BODY_METRIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Borra una medida por id. */
export async function deleteMetric(id) {
  const { error } = await supabase.from(BODY_METRICS_TABLE).delete().eq('id', id);
  if (error) throw Errors.internal(error.message);
}
```

- [ ] **Step 8: Completar el service.** En `body-metrics.service.js`:

1. Los imports quedan así:

```js
import { Errors } from '../../shared/utils/errors.js';
import * as bodyMetricsRepo from '../../repositories/body-metrics/body-metrics.repository.js';
import { toBodyMetric, withBmiHistory } from '../../models/body-metrics/body-metric.model.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';
```

2. Al final del archivo se agrega:

```js
/** GET /students/:id/metrics — historial ascendente con IMC. */
export async function list(user, studentId) {
  await assertCanAccessStudent(user, studentId);
  const rows = await bodyMetricsRepo.findMetricsByStudent(studentId);
  return withBmiHistory(rows);
}

/**
 * POST /students/:id/metrics — trainer dueño o el propio alumno. recorded_by
 * sale del rol del usuario. Si el id del cliente ya existe para este alumno es
 * un reintento (offline-first): devuelve lo guardado con created = false.
 */
export async function create(user, studentId, fields) {
  await assertCanAccessStudent(user, studentId);

  const inserted = await bodyMetricsRepo.insertMetric({
    ...fields,
    student_id: studentId,
    recorded_by: user.role,
  });
  if (inserted) return { metric: await resolveBmi(inserted), created: true };

  const existing = await bodyMetricsRepo.findMetricById(fields.id);
  if (!existing || existing.student_id !== studentId) throw Errors.metricIdConflict();
  return { metric: await resolveBmi(existing), created: false };
}

/**
 * DELETE /students/:id/metrics/:metricId — el trainer dueño borra cualquiera;
 * el alumno, solo las que cargó él. Una medida que no es de este alumno es 404.
 */
export async function remove(user, studentId, metricId) {
  await assertCanAccessStudent(user, studentId);

  const metric = await bodyMetricsRepo.findMetricById(metricId);
  if (!metric || metric.student_id !== studentId) throw Errors.metricNotFound();
  if (user.role === 'student' && metric.recorded_by !== 'student') throw Errors.forbidden();

  await bodyMetricsRepo.deleteMetric(metricId);
}
```

`toBodyMetric` ya lo usa `resolveBmi`, que está más arriba en el mismo archivo.

- [ ] **Step 9: Correr y ver que pasa**

Run: `cd backend && npm test -- tests/unit/services/body-metrics`
Expected: PASS, 15 tests.

- [ ] **Step 10: Crear el controller**

`backend/src/controllers/body-metrics/body-metrics.controller.js`:

```js
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as bodyMetricsService from '../../services/body-metrics/body-metrics.service.js';

/** GET /students/:id/metrics — historial ascendente con IMC. 200 → { data } */
export const list = asyncHandler(async (req, res) => {
  const data = await bodyMetricsService.list(req.user, req.params.id);
  res.json({ data });
});

/** POST /students/:id/metrics — 201 si es nueva, 200 si es un reintento con el mismo id. */
export const create = asyncHandler(async (req, res) => {
  const { metric, created } = await bodyMetricsService.create(req.user, req.params.id, req.body);
  res.status(created ? 201 : 200).json({ data: metric });
});

/** DELETE /students/:id/metrics/:metricId — 204. */
export const remove = asyncHandler(async (req, res) => {
  await bodyMetricsService.remove(req.user, req.params.id, req.params.metricId);
  res.status(204).end();
});
```

- [ ] **Step 11: Crear las rutas**

`backend/src/routes/body-metrics/body-metrics.routes.js`:

```js
import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import { validateStudentIdParam } from '../../validations/students/students.validation.js';
import {
  validateCreateMetric,
  validateMetricParams,
} from '../../validations/body-metrics/body-metrics.validation.js';
import * as bodyMetricsController from '../../controllers/body-metrics/body-metrics.controller.js';

// Montado en /students/:id/metrics. mergeParams: trae el :id del router padre.
const router = Router({ mergeParams: true });

// Trainer dueño o el propio alumno: el ownership se valida en el service.
router.use(authenticate, requireRole('trainer', 'student'));

router.get('/', validate(validateStudentIdParam, 'params'), bodyMetricsController.list);
router.post(
  '/',
  validate(validateStudentIdParam, 'params'),
  validate(validateCreateMetric),
  bodyMetricsController.create
);
router.delete('/:metricId', validate(validateMetricParams, 'params'), bodyMetricsController.remove);

export default router;
```

- [ ] **Step 12: Montar el router en `students.routes.js`**

1. Debajo del import del controller:

```js
import bodyMetricsRoutes from '../body-metrics/body-metrics.routes.js';
```

2. Antes de `export default router;`:

```js
// Medidas corporales del alumno: /students/:id/metrics.
router.use('/:id/metrics', bodyMetricsRoutes);
```

- [ ] **Step 13: Correr toda la suite y el lint**

Run: `cd backend && npm test && npm run lint`
Expected: todos los tests en PASS y lint sin errores. Con `max-lines` puede salir algún warning; si algún archivo pasa de 200 líneas, se para y se avisa.

- [ ] **Step 14: Commit (lo hace Igna)**

```bash
git add backend/src backend/tests/unit/validations/body-metrics backend/tests/unit/services/body-metrics
git commit -m "feat(body-metrics): historial de medidas del alumno con IMC calculado y carga idempotente"
```

---

### Task 7: README — endpoints y lo que le toca a la web (Pablo)

**Files:**
- Modify: `backend/README.md` (línea de "Módulos implementados", tabla "Alumnos" y una sección nueva después de "Notas de implementación")

**Interfaces:**
- Consumes: el comportamiento final de las Tasks 3 a 6.

- [ ] **Step 1: Actualizar la lista de módulos.** La línea `Módulos implementados: ...` queda así:

```markdown
Módulos implementados: `health`, `auth`, `invitations`, `students`, `body-metrics`, `exercises`, `routines`.
```

- [ ] **Step 2: Reemplazar la tabla de Alumnos.** Se reemplaza el bloque `### Alumnos — Fase 1/2` con su tabla por:

```markdown
### Alumnos y medidas corporales — Fase 1/2

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/students` | — | Alta del alumno desde token de invitación |
| GET | `/api/students` | trainer | Lista los alumnos del PT con `last_session_at`. Por defecto **solo activos**; `?active=false` trae los dados de baja. También `search`, `page`, `limit` |
| GET | `/api/students/:id` | trainer dueño / el propio alumno | Ficha completa: `gym_equipment`, `injuries`, `level`, `latest_metrics` (con `bmi`) y `active_routine` (`{ id, name, days }`) |
| PATCH | `/api/students/:id` | trainer dueño | Edita `name`, `goal`, `level`, `active`, `birth_date`, `gym_equipment`, `injuries` (al menos uno). `active: false` = baja: revoca sus sesiones |
| GET | `/api/students/:id/metrics` | trainer dueño / el propio alumno | Historial de medidas, de la más vieja a la más nueva, con `bmi` |
| POST | `/api/students/:id/metrics` | trainer dueño / el propio alumno | Carga una medida. 201 si es nueva, 200 si es un reintento con el mismo `id` |
| DELETE | `/api/students/:id/metrics/:metricId` | trainer dueño (cualquiera) / alumno (solo las suyas) | Borra una medida. 204 |

Ajeno o inexistente → **403** (no revela qué ids existen).
```

- [ ] **Step 3: Sumar la sección de desvíos.** Va al final de "Notas de implementación (desvíos respecto del DER de Notion)", como sección propia:

```markdown
## Desvíos respecto del contrato de API (Notion v1.1)

El contrato de Notion no se actualizó (el plan gratis está lleno). **Lo que vale es esto.**

### Alumnos (`/students`)

- **`GET /students`:** cada alumno trae `last_session_at` (timestamp, o `null` si nunca entrenó), que sale de la vista `student_last_session`. **Por defecto trae solo los activos**; los dados de baja se piden con `?active=false`.
- **`GET /students/:id`:** responde `{ data }`, con `latest_metrics` (la última medida con `bmi`, o `null`) y `active_routine` (`{ id, name, days }`, o `null`).
- **`PATCH /students/:id`:** devuelve la ficha completa en `{ data }`, con la misma forma que el GET.
- **Baja del alumno** (`active: false`): no se borra nada.
  - El login y el refresh del alumno responden `401 ACCOUNT_DISABLED`.
  - Sus refresh tokens se revocan; el access token que tenga dura como mucho `JWT_EXPIRES_IN` (1 h).
  - Con `active: true` vuelve a entrar con la misma contraseña.
  - Solo el entrenador da de baja; nada lo hace de forma automática por inactividad.

### Medidas corporales (`/students/:id/metrics`)

- Las rutas siguen el contrato (`/students/:id/metrics`), no `/body-metrics`.
- **`POST`:**
  - suma `height_cm`, que hace falta para el IMC;
  - suma un `id` opcional (UUID generado en el cliente): un reintento con el mismo `id` responde 200 con lo ya guardado, sin duplicar;
  - las medidas van como **números JSON** (`"80"` como string da 400), son ≥ 0 y `body_fat_pct` ≤ 100;
  - tiene que venir al menos una;
  - `recorded_at` es opcional (por defecto, ahora), en ISO 8601 **con zona** (`Z` o `-03:00`), y no puede ser futuro;
  - `recorded_by` lo pone el backend según el rol.
- **`bmi` se calcula en cada respuesta y no existe en la tabla.** Si la medida no trae altura, se usa la última registrada antes de esa medida. Puede venir `null`.
- **Nuevos:** `GET /students/:id/metrics` (historial ascendente) y `DELETE /students/:id/metrics/:metricId`. No hay `PATCH`: para corregir, se borra y se vuelve a cargar.

### Lo que le toca a la web

- **Panel de alumnos:**
  - mostrar `last_session_at` ("Nunca entrenó" si es `null`);
  - sumar un filtro o una pestaña "Dados de baja" que pida `?active=false`.
- **Ficha del alumno:**
  - mostrar y editar `gym_equipment` (lista de textos), `injuries` y `level`;
  - pedirlos al editar, porque sin esos datos los asistentes IA del S4 sugieren cualquier cosa;
  - mostrar `latest_metrics` y `active_routine`, contemplando que vengan en `null`.
- **Dar de baja o reactivar:** es un `PATCH` con `active: false` o `true`. Pedir confirmación, porque la baja cierra las sesiones del alumno.
- **Medidas:**
  - historial con `GET` (ya viene ordenado para graficar);
  - carga con `POST` (convertir los inputs a número y mandar `recorded_at` con zona);
  - borrado con `DELETE`;
  - el IMC no se calcula en la web: se usa el `bmi` de la respuesta.
- **Login web:** si un alumno recibe `ACCOUNT_DISABLED`, mostrar "Tu entrenador dio de baja tu cuenta".
```

- [ ] **Step 4: Revisar el render.** Abrir `backend/README.md` y confirmar que las tablas tienen la misma cantidad de columnas en cada fila y que la sección nueva quedó después de las notas del DER.

- [ ] **Step 5: Commit (lo hace Igna)**

```bash
git add backend/README.md
git commit -m "docs(backend): endpoints de alumnos y medidas, y desvíos respecto del contrato"
```

---

### Task 8: Verificación final y prueba del criterio de aceptación (E2E contra Supabase dev)

**Files:**
- Create (scratchpad, no va al repo): `e2e-tarjeta-7.sh`, en el directorio scratchpad de la sesión.

- [ ] **Step 1: Suite completa y lint**

Run: `cd backend && npm run lint && npm test`
Expected: lint sin errores y todos los tests en PASS. Se anota cuántos tests son.

- [ ] **Step 2: Levantar el backend local** contra Supabase dev, con `backend/.env` ya configurado.

Run (en segundo plano): `cd backend && npm run dev`
Expected: el log dice que escucha en `:3001`, y `curl -s localhost:3001/api/health` responde `status`.

- [ ] **Step 3: Escribir el script E2E.** Crea sus propios usuarios (entrenador A con su alumna, y entrenador B), así no hace falta ninguna contraseña existente. Pedirle el OK a Igna antes de correrlo, porque escribe en la base dev.

`e2e-tarjeta-7.sh`:

```bash
#!/usr/bin/env bash
# E2E tarjeta 7 contra el backend local (:3001) + Supabase dev.
set -u
API=http://localhost:3001/api
TS=$(date +%s)
PASS='Password1'
jget() { node -pe "JSON.parse(require('fs').readFileSync(0,'utf8'))$1"; }
post() { curl -s -X POST "$API$1" -H 'Content-Type: application/json' ${3:+-H "Authorization: Bearer $3"} -d "$2"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
ok() { if [ "$2" = "$3" ]; then echo "OK   $1 ($2)"; else echo "FAIL $1: esperado $3, vino $2"; fi; }

# Entrenador A + alumna, entrenador B
TA=$(post /auth/register "{\"name\":\"Profe A $TS\",\"email\":\"profe.a.$TS@test.com\",\"password\":\"$PASS\"}" | jget .token)
TB=$(post /auth/register "{\"name\":\"Profe B $TS\",\"email\":\"profe.b.$TS@test.com\",\"password\":\"$PASS\"}" | jget .token)
INV=$(post /invitations "{\"student_name\":\"Alumna $TS\",\"student_email\":\"alumna.$TS@test.com\",\"goal\":\"strength\",\"delivery_channel\":\"qr\"}" "$TA" | jget .data.token)
ALTA=$(post /students "{\"token\":\"$INV\",\"password\":\"$PASS\"}")
SID=$(echo "$ALTA" | jget .student.id); TS_TOKEN=$(echo "$ALTA" | jget .token); RS=$(echo "$ALTA" | jget .refresh_token)
echo "alumna: $SID"
echo ">>> Ahora insertar una sesión de prueba para la alumna (ver Step 4) y apretar Enter"; read -r

# 1) El PT ve solo sus alumnos, con last_session_at
LIST=$(curl -s "$API/students" -H "Authorization: Bearer $TA")
ok "listado trae 1 alumno" "$(echo "$LIST" | jget .data.length)" 1
ok "listado trae last_session_at" "$(echo "$LIST" | jget '.data[0].last_session_at !== null')" true
ok "el PT B no ve a la alumna" "$(curl -s "$API/students" -H "Authorization: Bearer $TB" | jget .data.length)" 0

# 2) Otro entrenador pide la ficha → 403
ok "ficha pedida por el PT B" "$(code "$API/students/$SID" -H "Authorization: Bearer $TB")" 403
ok "medidas pedidas por el PT B" "$(code "$API/students/$SID/metrics" -H "Authorization: Bearer $TB")" 403
ok "id inválido → 400" "$(code "$API/students/no-es-uuid/metrics" -H "Authorization: Bearer $TA")" 400

# 3) Tres medidas desordenadas → vuelven ordenadas
for d in 2026-10-10 2026-10-01 2026-10-05; do
  post "/students/$SID/metrics" "{\"weight_kg\":70,\"height_cm\":165,\"recorded_at\":\"${d}T12:00:00Z\"}" "$TA" > /dev/null
done
HIST=$(curl -s "$API/students/$SID/metrics" -H "Authorization: Bearer $TA")
ok "historial ordenado" "$(echo "$HIST" | jget ".data.map(m=>m.recorded_at.slice(0,10)).join(',')")" "2026-10-01,2026-10-05,2026-10-10"
ok "bmi calculado" "$(echo "$HIST" | jget '.data[0].bmi')" 25.7

# Carga del alumno, reintento idempotente y permisos de borrado
MID=$(node -pe "crypto.randomUUID()")
ok "alumna carga (201)" "$(code -X POST "$API/students/$SID/metrics" -H 'Content-Type: application/json' -H "Authorization: Bearer $TS_TOKEN" -d "{\"id\":\"$MID\",\"weight_kg\":69}")" 201
ok "reintento mismo id (200)" "$(code -X POST "$API/students/$SID/metrics" -H 'Content-Type: application/json' -H "Authorization: Bearer $TS_TOKEN" -d "{\"id\":\"$MID\",\"weight_kg\":69}")" 200
ok "sigue habiendo 4 medidas" "$(curl -s "$API/students/$SID/metrics" -H "Authorization: Bearer $TA" | jget .data.length)" 4
TRAINER_MID=$(echo "$HIST" | jget '.data[0].id')
ok "alumna no borra la del PT (403)" "$(code -X DELETE "$API/students/$SID/metrics/$TRAINER_MID" -H "Authorization: Bearer $TS_TOKEN")" 403
ok "alumna borra la suya (204)" "$(code -X DELETE "$API/students/$SID/metrics/$MID" -H "Authorization: Bearer $TS_TOKEN")" 204
ok "ficha propia de la alumna" "$(curl -s "$API/students/$SID" -H "Authorization: Bearer $TS_TOKEN" | jget '.data.latest_metrics.recorded_at.slice(0,10)')" 2026-10-10

# 4) Baja → ACCOUNT_DISABLED; reactivación → vuelve a entrar
curl -s -X PATCH "$API/students/$SID" -H 'Content-Type: application/json' -H "Authorization: Bearer $TA" -d '{"active":false}' > /dev/null
ok "login de la alumna dada de baja" "$(post /auth/login "{\"email\":\"alumna.$TS@test.com\",\"password\":\"$PASS\"}" | jget .error.code)" ACCOUNT_DISABLED
ok "refresh de la alumna dada de baja (token revocado)" "$(post /auth/refresh "{\"refresh_token\":\"$RS\"}" | jget .error.code)" UNAUTHORIZED
ok "no aparece en el listado por defecto" "$(curl -s "$API/students" -H "Authorization: Bearer $TA" | jget .data.length)" 0
ok "aparece con ?active=false" "$(curl -s "$API/students?active=false" -H "Authorization: Bearer $TA" | jget .data.length)" 1
curl -s -X PATCH "$API/students/$SID" -H 'Content-Type: application/json' -H "Authorization: Bearer $TA" -d '{"active":true}' > /dev/null
ok "reactivada vuelve a loguear" "$(post /auth/login "{\"email\":\"alumna.$TS@test.com\",\"password\":\"$PASS\"}" | jget '.user.role')" student

echo "Limpieza: borrar los trainers profe.a.$TS@test.com y profe.b.$TS@test.com (cascade)."
```

Cuenta del IMC del historial: 70 / 1.65² = 25.71 → 25.7.

- [ ] **Step 4: Correr el script.** Cuando pida la sesión, insertarla en Supabase dev (MCP `execute_sql` o SQL Editor):

```sql
insert into sessions (student_id, started_at) values ('<SID que imprimió el script>', now() - interval '2 days');
```

Run: `bash <scratchpad>/e2e-tarjeta-7.sh`
Expected: todas las líneas empiezan con `OK`. Si alguna dice `FAIL`, se investiga con el skill `superpowers:systematic-debugging` antes de tocar código.

- [ ] **Step 5: Limpiar los datos de prueba** (con el OK de Igna):

```sql
delete from trainers where email in ('profe.a.<TS>@test.com', 'profe.b.<TS>@test.com');
```

El `on delete cascade` borra la alumna, la invitación, sus medidas y su sesión. Los refresh tokens no tienen FK; se borran aparte:

```sql
delete from refresh_tokens where user_id not in (select id from trainers union select id from students);
```

- [ ] **Step 6: Dejar el estado en Trello y avisar a Igna**

1. Contarle el resultado: tests, lint y E2E.
2. Recordarle los commits pendientes.
3. Pasarle el resumen del PR: el contenido de "Desvíos respecto del contrato de API" del README, sin firmas de IA.
4. Recordarle la tarea mobile que quedó fuera: el mensaje de `ACCOUNT_DISABLED`, unos 30 minutos, en la próxima tarjeta que toque el login.
