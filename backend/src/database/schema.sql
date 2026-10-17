-- ============================================================================
-- FitTrainer — Schema SQL completo (18 tablas del DER + refresh_tokens).
-- Ejecutar en el SQL Editor de Supabase. Es re-ejecutable: todo usa
-- "if not exists" y los alter van en bloques idempotentes.
--
-- Seguridad: RLS activado en todas las tablas y SIN políticas (ver
-- docs/adr/0001-autorizacion-en-services-rls-deny-all.md). El backend usa la
-- SERVICE ROLE key, que bypasea RLS, y valida ownership/rol en la capa Service.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── trainers ────────────────────────────────────────────────────────────────
-- Agrega password_hash respecto del DER original: el modelo de datos no
-- contemplaba credenciales y la autenticación por email/password lo requiere.
create table if not exists trainers (
  id            uuid primary key default gen_random_uuid(),
  name          varchar(100) not null,
  email         varchar(255) not null unique,
  password_hash varchar(255) not null,
  specialty     varchar(255),
  avatar_url    text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_trainers_email on trainers (email);

-- ── refresh_tokens ───────────────────────────────────────────────────────────
-- Tabla nueva (no estaba en el DER). Permite revocar refresh tokens en el
-- logout y rotarlos. Se persiste solo el hash SHA-256 del token, nunca el valor.
-- user_id referencia a trainers o students según 'role' (no hay FK dura porque
-- apunta a dos tablas distintas).
create table if not exists refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  role       varchar(20) not null check (role in ('trainer', 'student')),
  token_hash varchar(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_refresh_tokens_hash on refresh_tokens (token_hash);
create index if not exists idx_refresh_tokens_user on refresh_tokens (user_id);

-- ── students ─────────────────────────────────────────────────────────────────
-- Agrega password_hash respecto del DER (igual que trainers: el login del
-- alumno por email/password lo requiere). Se crea acá porque es el destino del
-- onboarding (CU-02) y el target del chequeo de email de las invitaciones.
create table if not exists students (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null references trainers (id) on delete cascade,
  name          varchar(100) not null,
  email         varchar(255) not null unique,
  password_hash varchar(255),
  goal          varchar(20) check (goal in ('tonify', 'weight_loss', 'hypertrophy', 'strength')),
  birth_date    date,
  avatar_url    text,
  active        boolean not null default true,
  gym_equipment text[],
  injuries      text,
  level         varchar(20) check (level in ('beginner', 'intermediate', 'advanced')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_students_trainer on students (trainer_id);
create index if not exists idx_students_email on students (email);

-- ── invitations ──────────────────────────────────────────────────────────────
-- Agrega student_email respecto del DER: el contrato de API lo requiere
-- (POST /invitations lo recibe y GET /invitations/:token lo devuelve).
create table if not exists invitations (
  id               uuid primary key default gen_random_uuid(),
  trainer_id       uuid not null references trainers (id) on delete cascade,
  token            varchar(64) not null unique,
  student_name     varchar(100) not null,
  student_email    varchar(255) not null,
  student_phone    varchar(30),
  student_goal     varchar(20) check (student_goal in ('tonify', 'weight_loss', 'hypertrophy', 'strength')),
  delivery_channel varchar(20) not null check (delivery_channel in ('whatsapp', 'qr', 'both')),
  expires_at       timestamptz not null,
  used_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_invitations_token on invitations (token);
create index if not exists idx_invitations_trainer on invitations (trainer_id);

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
create index if not exists idx_chat_messages_session on chat_messages (session_id);

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
