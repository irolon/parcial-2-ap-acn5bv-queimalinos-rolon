-- ============================================================================
-- FitTrainer — Schema 03 · exercises, routines, routine_exercises,
-- routine_templates y la FK routines_template_id_fkey. Va después de
-- 02-students.sql. Re-ejecutable.
-- ============================================================================

-- ── exercises (Fase 2) ───────────────────────────────────────────────────────
-- trainer_id null = ejercicio global (disponible para todos). muscle_group no
-- estaba enumerado en el DER; se define el set por CHECK.
create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid references trainers (id) on delete cascade,
  name         varchar(120) not null,
  muscle_group varchar(20) check (muscle_group in (
    'chest', 'back', 'shoulders', 'legs', 'glutes', 'biceps',
    'triceps', 'core', 'calves', 'full_body', 'cardio'
  )),
  equipment    varchar(60),
  description  text,
  video_url    text,
  is_global    boolean not null default false
);

create index if not exists idx_exercises_trainer on exercises (trainer_id);
create index if not exists idx_exercises_muscle on exercises (muscle_group);
-- Un nombre no se repite entre los globales; hace idempotente el seed (on conflict).
create unique index if not exists uq_exercises_global_name on exercises (name) where is_global;

-- ── routines (Fase 2) ────────────────────────────────────────────────────────
create table if not exists routines (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references trainers (id) on delete cascade,
  student_id  uuid not null references students (id) on delete cascade,
  template_id uuid,  -- FK a routine_templates: se agrega más abajo (routines_template_id_fkey)
  name        varchar(120) not null,
  goal        varchar(20) check (goal in ('tonify', 'weight_loss', 'hypertrophy', 'strength')),
  days        text[] not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_routines_student on routines (student_id);
create index if not exists idx_routines_trainer on routines (trainer_id);

-- ── routine_exercises (pivote N:M routines ↔ exercises) ───────────────────────
-- El DER llama 'order' a la columna de orden, pero es palabra reservada en SQL;
-- se renombra a order_index.
create table if not exists routine_exercises (
  id           uuid primary key default gen_random_uuid(),
  routine_id   uuid not null references routines (id) on delete cascade,
  exercise_id  uuid not null references exercises (id),
  sets         int,
  reps         int,
  rest_seconds int,
  suggested_kg numeric,
  tempo        varchar(20),
  notes        text,
  order_index  int not null default 0
);

create index if not exists idx_routine_exercises_routine on routine_exercises (routine_id);

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

