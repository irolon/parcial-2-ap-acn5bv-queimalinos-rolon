# Schema completo + RLS deny-all — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar las 12 tablas faltantes del DER a `schema.sql`, activar RLS sin políticas en las 19 tablas, documentar la decisión en un ADR y aplicarlo al proyecto Supabase `Fit-Trainer`.

**Architecture:** `schema.sql` sigue siendo el único archivo del schema, re-ejecutable (`if not exists` en todo). Un script SQL de chequeos (`schema-checks.sql`) cumple el rol de test: devuelve una fila por cada cosa que falta y cero filas cuando el schema está completo. Un script Node (`check-anon-access.js`) prueba el camino real de exposición: la API REST de Supabase con la anon key.

**Tech Stack:** PostgreSQL 17 (Supabase), Node 20 ESM, MCP de Supabase (`execute_sql`, `apply_migration`, `list_tables`, `get_advisors`).

**Spec:** `docs/superpowers/specs/2026-10-12-schema-completo-design.md`

## Global Constraints

- Enums como `varchar` + `CHECK (... in (...))`, nunca tipos `enum` de Postgres.
- Todo `create table if not exists` / `create index if not exists`; el archivo entero se puede re-ejecutar.
- PK `uuid primary key default gen_random_uuid()`. En `sessions` y `session_sets` el `id` lo genera el cliente mobile (el default queda de fallback).
- `session_sets.executed_at` es `not null` y representa el momento real de la serie.
- Cada desvío del DER lleva un comentario arriba de la tabla.
- RLS activado en las 19 tablas, **cero** `create policy`.
- Los agentes no commitean ni pushean: los pasos "Commit" los ejecuta Igna.
- Backend: `npm run lint` y `npm test` en `backend/` antes de dar por terminado.

## Review Focus

1. **Re-ejecutar `schema.sql` sobre la base ya migrada** → no debe fallar. El riesgo está en la FK de `routines.template_id` (un `alter table add constraint` repetido falla) y en los `enable row level security`. Lo cubre la Task 5, paso 4.
2. **Borrar una rutina que tiene sesiones** → las sesiones y sus series deben quedar, con `routine_id` y `routine_exercise_id` en null. Lo cubre el chequeo de `confdeltype` en `schema-checks.sql` (Task 1).
3. **Una tabla vacía devuelve `[]` con la anon key aunque no tenga RLS** → el script anon no alcanza solo, por eso el flag `rowsecurity` se verifica aparte en `schema-checks.sql`. Lo cubren las Tasks 1 y 5.
4. **Un sync que reintenta con el mismo UUID de `session_sets`** → el segundo insert debe chocar contra la PK y no duplicar. La garantía es la PK uuid sin default forzado; se prueba en la Task 5, paso 3.
5. **El backend deja de andar después de activar RLS** → no debería, porque la `service_role` bypasea RLS. Se confirma con `GET /health` y la suite de tests. Lo cubre la Task 5, paso 6.

---

## Task 0: Preparación (Igna + Claude)

- [ ] **Step 1 (Igna): crear la rama**

```bash
git checkout develop && git pull
git checkout -b feature/schema-completo
```

- [ ] **Step 2 (Claude, con OK de Igna): reactivar el proyecto Supabase**

MCP: `restore_project` con `project_id = yqjhonnetginzayzymyr`. Esperar a que `get_project` devuelva `status: ACTIVE_HEALTHY`.

- [ ] **Step 3 (Igna): confirmar que `backend/.env` tiene `SUPABASE_URL` y `SUPABASE_ANON_KEY`** del proyecto `Fit-Trainer` (Dashboard → Settings → API).

---

## Task 1: Chequeos del schema (el test que falla)

**Files:**
- Create: `backend/src/database/schema-checks.sql`
- Create: `backend/src/database/check-anon-access.js`
- Modify: `backend/package.json` (script `db:check-anon`)

**Interfaces:**
- Produces: `schema-checks.sql` devuelve una columna `problema` (text), una fila por falla y cero filas si todo está bien. `npm run db:check-anon` sale con código 1 si alguna tabla devuelve filas con la anon key.

- [ ] **Step 1: escribir `schema-checks.sql`**

```sql
-- ============================================================================
-- FitTrainer — Chequeos del schema. Cero filas = schema completo y seguro.
-- Ejecutar en el SQL Editor de Supabase (o vía MCP execute_sql).
-- ============================================================================
with expected (t) as (
  values ('trainers'), ('refresh_tokens'), ('students'), ('body_metrics'),
         ('invitations'), ('exercises'), ('routine_templates'), ('routines'),
         ('routine_exercises'), ('sessions'), ('session_sets'),
         ('achievements'), ('student_achievements'), ('challenges'),
         ('student_challenges'), ('chat_messages'),
         ('ai_routine_generations'), ('appointments'), ('notifications')
)
select 'falta la tabla ' || t as problema
from expected e
where to_regclass('public.' || e.t) is null

union all
select 'RLS desactivado en ' || tablename
from pg_tables
where schemaname = 'public' and not rowsecurity

union all
select 'no debería haber políticas: ' || tablename || '.' || policyname
from pg_policies
where schemaname = 'public'

union all
-- on delete esperado: n = set null, c = cascade
select format('%s.%s: on delete debería ser %s', v.tbl, v.col, v.expected)
from (values
  ('routines',      'template_id',         'n'),
  ('sessions',      'routine_id',          'n'),
  ('session_sets',  'session_id',          'c'),
  ('session_sets',  'routine_exercise_id', 'n'),
  ('chat_messages', 'session_id',          'n')
) v (tbl, col, expected)
where not exists (
  select 1
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.contype = 'f'
    and c.conrelid = to_regclass('public.' || v.tbl)
    and a.attname = v.col
    and c.confdeltype = v.expected
)

union all
select format('%s.%s debería ser not null', v.tbl, v.col)
from (values
  ('session_sets',  'exercise_id'),
  ('session_sets',  'executed_at'),
  ('notifications', 'user_role')
) v (tbl, col)
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = v.tbl
    and column_name = v.col and is_nullable = 'NO'
);
```

- [ ] **Step 2: escribir `check-anon-access.js`**

```js
import dotenv from 'dotenv';

/**
 * Verifica que la API REST pública de Supabase no exponga datos con la anon
 * key. Con RLS activo y sin políticas, cada tabla devuelve [].
 *
 * Ojo: una tabla VACÍA también devuelve [] aunque no tenga RLS. Este script es
 * concluyente para las tablas con datos; el flag de RLS de todas se verifica en
 * schema-checks.sql.
 *
 * Uso: npm run db:check-anon (lee SUPABASE_URL y SUPABASE_ANON_KEY de .env)
 */
dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en backend/.env');
  process.exit(1);
}

const TABLES = [
  'trainers', 'refresh_tokens', 'students', 'body_metrics', 'invitations',
  'exercises', 'routine_templates', 'routines', 'routine_exercises', 'sessions',
  'session_sets', 'achievements', 'student_achievements', 'challenges',
  'student_challenges', 'chat_messages', 'ai_routine_generations',
  'appointments', 'notifications',
];

let exposed = 0;
for (const table of TABLES) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const body = await res.json();
  const leaks = res.ok && Array.isArray(body) && body.length > 0;
  if (leaks) exposed += 1;
  console.log(`${leaks ? 'EXPUESTA' : 'ok      '}  ${table}  (HTTP ${res.status})`);
}

console.log(exposed ? `\n${exposed} tabla(s) expuestas con la anon key` : '\nNinguna tabla expuesta');
process.exit(exposed ? 1 : 0);
```

- [ ] **Step 3: agregar el script a `backend/package.json`**, después de `"format"`:

```json
"db:check-anon": "node src/database/check-anon-access.js"
```

- [ ] **Step 4: correr los chequeos y ver que fallan**

MCP `execute_sql` (project `yqjhonnetginzayzymyr`) con el contenido de `schema-checks.sql`.
Esperado: 12 filas "falta la tabla …", 7 filas "RLS desactivado en …" y las filas de `on delete` / `not null` de las tablas que faltan.

Run: `cd backend && npm run db:check-anon`
Esperado: `EXPUESTA exercises` (el seed tiene ejercicios globales), además de `trainers`/`students` si hay datos de desarrollo; HTTP 404 en las 12 tablas que no existen; exit code 1.

- [ ] **Step 5: lint**

Run: `cd backend && npm run lint`
Esperado: sin errores.

- [ ] **Step 6 (Igna): commit**

```bash
git add backend/src/database/schema-checks.sql backend/src/database/check-anon-access.js backend/package.json
git commit -m "test(db): chequeos del schema y de exposición con la anon key"
```

---

## Task 2: Tablas de entrenamiento y sesiones

**Files:**
- Modify: `backend/src/database/schema.sql` (agregar al final, después de `routine_exercises`, línea 141)

**Interfaces:**
- Consumes: `trainers`, `students`, `routines`, `exercises`, `routine_exercises` (ya existentes).
- Produces: `body_metrics`, `routine_templates`, `sessions`, `session_sets`, y la FK `routines_template_id_fkey`. Las Tasks 3 y 4 referencian `sessions(id)` y `routine_templates(id)`.

- [ ] **Step 1: actualizar el encabezado de `schema.sql`** (líneas 1-8):

```sql
-- ============================================================================
-- FitTrainer — Schema SQL completo (18 tablas del DER + refresh_tokens).
-- Ejecutar en el SQL Editor de Supabase. Es re-ejecutable: todo usa
-- "if not exists" y los alter van en bloques idempotentes.
--
-- Seguridad: RLS activado en todas las tablas y SIN políticas (ver
-- docs/adr/0001-autorizacion-en-services-rls-deny-all.md). El backend usa la
-- SERVICE ROLE key, que bypasea RLS, y valida ownership/rol en la capa Service.
-- ============================================================================
```

- [ ] **Step 2: agregar las cuatro tablas al final del archivo**

```sql
-- ── body_metrics (Fase 3) ────────────────────────────────────────────────────
create table if not exists body_metrics (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students (id) on delete cascade,
  weight_kg    numeric check (weight_kg >= 0),
  height_cm    numeric check (height_cm >= 0),
  body_fat_pct numeric check (body_fat_pct >= 0),
  waist_cm     numeric check (waist_cm >= 0),
  hip_cm       numeric check (hip_cm >= 0),
  chest_cm     numeric check (chest_cm >= 0),
  recorded_at  timestamptz not null default now()
);

create index if not exists idx_body_metrics_student on body_metrics (student_id, recorded_at desc);

-- ── routine_templates ────────────────────────────────────────────────────────
create table if not exists routine_templates (
  id                 uuid primary key default gen_random_uuid(),
  trainer_id         uuid not null references trainers (id) on delete cascade,
  name               varchar(120) not null,
  goal               varchar(20) check (goal in ('tonify', 'weight_loss', 'hypertrophy', 'strength')),
  level              varchar(20) check (level in ('beginner', 'intermediate', 'advanced')),
  frequency_per_week int check (frequency_per_week between 1 and 7),
  generated_by_ai    boolean not null default false,
  structure          jsonb not null default '{}',
  created_at         timestamptz not null default now()
);

create index if not exists idx_routine_templates_trainer on routine_templates (trainer_id);

-- FK pendiente de routines.template_id (routines se creó antes que esta tabla).
-- set null: borrar una plantilla no borra las rutinas ya asignadas.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'routines_template_id_fkey') then
    alter table routines
      add constraint routines_template_id_fkey
      foreign key (template_id) references routine_templates (id) on delete set null;
  end if;
end $$;

-- ── sessions (Fase 3) ────────────────────────────────────────────────────────
-- El id lo genera el cliente mobile (offline-first): reintentar el sync no
-- duplica. Desvío del DER: routine_id es nullable con set null, para que
-- borrar una rutina no borre el historial de sesiones.
create table if not exists sessions (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references students (id) on delete cascade,
  routine_id        uuid references routines (id) on delete set null,
  started_at        timestamptz not null,
  finished_at       timestamptz,
  rpe               int check (rpe between 1 and 10),
  notes             text,
  trainer_comment   text,
  has_modifications boolean not null default false
);

create index if not exists idx_sessions_student on sessions (student_id, started_at desc);

-- ── session_sets (Fase 3) ────────────────────────────────────────────────────
-- El id lo genera el cliente mobile y executed_at es el momento real de la
-- serie, no el del sync. Desvíos del DER:
--   · exercise_id (nuevo): el ejercicio REALMENTE ejecutado. Base de los
--     gráficos de progreso; sobrevive a la edición/borrado de la rutina.
--   · original_exercise_id reemplaza a substituted_exercise_id: el ejercicio
--     planificado cuando hubo sustitución (null si no la hubo).
--   · routine_exercise_id queda como referencia opcional con set null.
create table if not exists session_sets (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references sessions (id) on delete cascade,
  exercise_id          uuid not null references exercises (id),
  original_exercise_id uuid references exercises (id) on delete set null,
  routine_exercise_id  uuid references routine_exercises (id) on delete set null,
  set_number           int not null check (set_number > 0),
  actual_reps          int check (actual_reps >= 0),
  actual_kg            numeric check (actual_kg >= 0),
  completed            boolean not null default true,
  executed_at          timestamptz not null
);

create index if not exists idx_session_sets_session on session_sets (session_id);
create index if not exists idx_session_sets_exercise on session_sets (exercise_id);
```

- [ ] **Step 3: quitar el comentario viejo de `routines.template_id`**

En `schema.sql:113`, reemplazar
```sql
  template_id uuid,  -- FK a routine_templates (tabla de fases posteriores)
```
por
```sql
  template_id uuid,  -- FK a routine_templates: se agrega más abajo (routines_template_id_fkey)
```

- [ ] **Step 4 (Igna): commit**

```bash
git add backend/src/database/schema.sql
git commit -m "feat(db): body_metrics, routine_templates, sessions y session_sets"
```

---

## Task 3: Gamificación, chat IA, agenda y notificaciones

**Files:**
- Modify: `backend/src/database/schema.sql` (agregar al final, después de `session_sets`)

**Interfaces:**
- Consumes: `trainers`, `students`, `sessions`, `routine_templates` (Task 2).
- Produces: `achievements`, `student_achievements`, `challenges`, `student_challenges`, `chat_messages`, `ai_routine_generations`, `appointments`, `notifications`.

- [ ] **Step 1: agregar las ocho tablas al final del archivo**

```sql
-- ── achievements (Fase 5 · catálogo global de logros) ────────────────────────
create table if not exists achievements (
  id          uuid primary key default gen_random_uuid(),
  code        varchar(50) not null unique,
  name        varchar(100) not null,
  description text,
  icon_url    text,
  category    varchar(20) check (category in ('streak', 'volume', 'consistency', 'pr', 'milestone')),
  criteria    jsonb not null default '{}'
);

-- ── student_achievements ─────────────────────────────────────────────────────
create table if not exists student_achievements (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students (id) on delete cascade,
  achievement_id uuid not null references achievements (id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  context        jsonb,
  unique (student_id, achievement_id)
);

-- ── challenges (trainer_id null = global) ────────────────────────────────────
create table if not exists challenges (
  id                    uuid primary key default gen_random_uuid(),
  trainer_id            uuid references trainers (id) on delete cascade,
  name                  varchar(100) not null,
  description           text,
  goal_type             varchar(20) check (goal_type in ('sessions_count', 'weight_target', 'streak', 'volume')),
  goal_value            numeric not null,
  duration_days         int check (duration_days > 0),
  reward_achievement_id uuid references achievements (id) on delete set null
);

create index if not exists idx_challenges_trainer on challenges (trainer_id);

-- ── student_challenges ───────────────────────────────────────────────────────
create table if not exists student_challenges (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students (id) on delete cascade,
  challenge_id     uuid not null references challenges (id) on delete cascade,
  started_at       timestamptz not null default now(),
  ends_at          timestamptz not null,
  current_progress numeric not null default 0,
  status           varchar(20) not null default 'active'
                   check (status in ('active', 'completed', 'failed', 'abandoned')),
  completed_at     timestamptz
);

create index if not exists idx_student_challenges_student on student_challenges (student_id);

-- ── chat_messages (asistente IA del alumno) ──────────────────────────────────
-- Desvío del DER: session_id es nullable con set null, para que el chat no
-- dependa de una sesión activa ni se pierda al borrarla.
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references sessions (id) on delete set null,
  student_id uuid not null references students (id) on delete cascade,
  role       varchar(20) not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_student on chat_messages (student_id, created_at);

-- ── ai_routine_generations (asistente IA del entrenador) ─────────────────────
create table if not exists ai_routine_generations (
  id                  uuid primary key default gen_random_uuid(),
  trainer_id          uuid not null references trainers (id) on delete cascade,
  student_id          uuid references students (id) on delete set null,
  input_params        jsonb not null,
  generated_routine   jsonb not null,
  was_used            boolean not null default false,
  routine_template_id uuid references routine_templates (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_ai_generations_trainer on ai_routine_generations (trainer_id);

-- ── appointments (Fase 6 · turnos PT–alumno) ─────────────────────────────────
create table if not exists appointments (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null references trainers (id) on delete cascade,
  student_id   uuid not null references students (id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_min int not null default 60 check (duration_min > 0),
  status       varchar(20) not null default 'pending'
               check (status in ('pending', 'confirmed', 'cancelled')),
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_appointments_trainer on appointments (trainer_id, scheduled_at);
create index if not exists idx_appointments_student on appointments (student_id);

-- ── notifications ────────────────────────────────────────────────────────────
-- Desvío del DER: user_role (nuevo). user_id apunta a trainers o students según
-- el rol, igual que refresh_tokens, así que no hay FK dura.
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  user_role  varchar(20) not null check (user_role in ('trainer', 'student')),
  type       varchar(30) not null check (type in (
    'inactivity', 'appointment', 'comment', 'pr', 'achievement', 'routine_modified'
  )),
  title      varchar(150) not null,
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications (user_id, read, created_at desc);
```

- [ ] **Step 2 (Igna): commit**

```bash
git add backend/src/database/schema.sql
git commit -m "feat(db): gamificación, chat IA, agenda y notificaciones"
```

---

## Task 4: RLS deny-all + ADR

**Files:**
- Modify: `backend/src/database/schema.sql` (bloque final)
- Create: `docs/adr/0001-autorizacion-en-services-rls-deny-all.md`

- [ ] **Step 1: agregar el bloque de RLS al final de `schema.sql`**

```sql
-- ── Row Level Security ───────────────────────────────────────────────────────
-- RLS activado SIN políticas en todas las tablas: anon y authenticated no ven
-- ninguna fila por la API REST de Supabase. El backend usa la service_role,
-- que bypasea RLS. Ver docs/adr/0001-autorizacion-en-services-rls-deny-all.md.
-- NO agregar "create policy" sin actualizar ese ADR.
alter table trainers               enable row level security;
alter table refresh_tokens         enable row level security;
alter table students               enable row level security;
alter table body_metrics           enable row level security;
alter table invitations            enable row level security;
alter table exercises              enable row level security;
alter table routine_templates      enable row level security;
alter table routines               enable row level security;
alter table routine_exercises      enable row level security;
alter table sessions               enable row level security;
alter table session_sets           enable row level security;
alter table achievements           enable row level security;
alter table student_achievements   enable row level security;
alter table challenges             enable row level security;
alter table student_challenges     enable row level security;
alter table chat_messages          enable row level security;
alter table ai_routine_generations enable row level security;
alter table appointments           enable row level security;
alter table notifications          enable row level security;
```

- [ ] **Step 2: escribir el ADR**

```markdown
# ADR 0001 — Autorización en la capa Service, RLS deny-all en la base

- **Estado:** aceptado
- **Fecha:** 2026-10-12

## Contexto

La doc de Arquitectura prometía dos capas de autorización: "RLS de Supabase +
middleware de Express". En la práctica, ningún cliente habla con Supabase:
la web y la app Android consumen la API REST del backend, y el backend accede
a la base con la `service_role` key, con la que Postgres ignora el RLS.

Políticas RLS por trainer, entonces, no se ejecutarían nunca y no se podrían
probar. Pero sin RLS hay un agujero real: Supabase publica las tablas de
`public` por su API REST (PostgREST) usando la anon key, que no es secreta.

## Decisión

1. RLS activado en todas las tablas de `public`, **sin políticas**. Los roles
   `anon` y `authenticated` no ven ninguna fila.
2. La separación entre trainers (un trainer solo ve sus alumnos; un alumno
   solo sus datos) se verifica en la capa Service, antes de cada lectura o
   escritura, con chequeos de ownership cubiertos por tests unitarios.

## Consecuencias

- La respuesta de defensa: "La base rechaza cualquier acceso que no sea del
  backend (RLS activo sin políticas), y el backend verifica la propiedad en
  cada service; los tests de ownership lo demuestran."
- Cada service nuevo tiene que hacer su chequeo de ownership y tener su test.
  No hay red de seguridad en la base para un service que se olvide.
- Si algún día un cliente consume Supabase directo (Realtime, Storage desde
  el browser), hay que escribir políticas para esas tablas y actualizar este
  ADR.
- Verificación: `backend/src/database/schema-checks.sql` (RLS activo, cero
  políticas) y `npm run db:check-anon` (nada expuesto con la anon key).
```

- [ ] **Step 3 (Igna): commit**

```bash
git add backend/src/database/schema.sql docs/adr/0001-autorizacion-en-services-rls-deny-all.md
git commit -m "feat(db): RLS deny-all en las 19 tablas + ADR 0001"
```

---

## Task 5: Aplicar y verificar

**Files:** ninguno nuevo (solo verificación).

- [ ] **Step 1: aplicar el schema completo**

MCP `apply_migration`, project `yqjhonnetginzayzymyr`, name `schema_completo_rls`, query = contenido entero de `backend/src/database/schema.sql`. Es seguro porque el archivo es idempotente: las 7 tablas existentes no se tocan.

- [ ] **Step 2: chequeos → cero filas**

MCP `execute_sql` con `schema-checks.sql`.
Esperado: **0 filas**.

- [ ] **Step 3: idempotencia del UUID del cliente (Review Focus 4)**

MCP `execute_sql`, todo dentro de una transacción que se revierte:

```sql
begin;
with t as (insert into trainers (name, email, password_hash)
           values ('Check', 'check-uuid@fittrainer.test', 'x') returning id),
     s as (insert into students (trainer_id, name, email)
           select id, 'Check', 'check-uuid-al@fittrainer.test' from t returning id)
insert into sessions (id, student_id, started_at)
select '00000000-0000-4000-8000-000000000001', s.id, now() from s;

insert into session_sets (id, session_id, exercise_id, set_number, executed_at)
select '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', id, 1, now()
from exercises limit 1;

-- Reintento del sync con el mismo id: debe fallar con duplicate key (23505)
insert into session_sets (id, session_id, exercise_id, set_number, executed_at)
select '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', id, 1, now()
from exercises limit 1;
rollback;
```

Esperado: error `duplicate key value violates unique constraint "session_sets_pkey"` en el segundo insert. Después, correr `rollback;` si la transacción quedó abierta. No queda ningún dato.

- [ ] **Step 4: re-ejecutar el schema (Review Focus 1)**

MCP `execute_sql` con el contenido entero de `schema.sql` otra vez.
Esperado: sin errores. Después, `schema-checks.sql` sigue devolviendo 0 filas.

- [ ] **Step 5: tablas, advisors y anon key**

- MCP `list_tables` (schema `public`) → 19 tablas, todas con `rls_enabled: true`.
- MCP `get_advisors` tipo `security` → ningún aviso `rls_disabled_in_public`. Se espera `rls_enabled_no_policy` en nivel INFO: es justamente la decisión del ADR, se ignora.
- Run: `cd backend && npm run db:check-anon` → `Ninguna tabla expuesta`, exit code 0.

- [ ] **Step 6: el backend sigue andando (Review Focus 5)**

Run: `cd backend && npm run lint && npm test`
Esperado: lint sin errores, todos los tests en verde.

Run: `docker compose up -d backend` (o `npm run dev`) y `curl http://localhost:3001/health`
Esperado: `200` con la base reportada como conectada.

- [ ] **Step 7: cierre**

- Claude: comentario en la tarjeta 2 de Trello con el resultado de los chequeos.
- Igna: push de `feature/schema-completo` y PR contra `develop`.
- Igna: actualizar la página *Arquitectura del sistema* de Notion para que diga "RLS deny-all + autorización en services" y linkee el ADR.
