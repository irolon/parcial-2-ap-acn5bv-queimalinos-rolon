-- ============================================================================
-- FitTrainer — Schema 06 · chat_messages, ai_routine_generations,
-- appointments, notifications. Va después de 05-gamification.sql.
-- Re-ejecutable.
-- ============================================================================

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

-- Tarjeta 44: contexto de la notificación y marca de push enviado.
alter table notifications add column if not exists data jsonb not null default '{}';
alter table notifications add column if not exists push_sent_at timestamptz;

create index if not exists idx_notifications_user on notifications (user_id, read, created_at desc);

-- Avisos de inactividad recientes (el job los consulta por tipo y fecha).
drop index if exists idx_notifications_inactivity;
create index if not exists idx_notifications_inactivity
  on notifications (created_at desc) where type = 'inactivity';

-- ── push_tokens ──────────────────────────────────────────────────────────────
-- user_id apunta a trainers o students según user_role (sin FK dura, como notifications).
create table if not exists push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  user_role    varchar(20) not null check (user_role in ('trainer', 'student')),
  token        text not null unique,
  platform     varchar(10) not null check (platform in ('android', 'web')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_push_tokens_user on push_tokens (user_id);
