-- ============================================================================
-- FitTrainer — Schema 06 · chat_messages, ai_routine_generations,
-- appointments, trainer_availability, notifications. Va después de 05-gamification.sql.
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

-- Tarjeta 46: agenda.
-- ── trainer_availability (franjas semanales del PT) ──────────────────────────
-- Horas en hora de Argentina (UTC-3 fijo). weekday: 1 = lunes … 7 = domingo.
-- Varias franjas por día; los turnos de 60 min salen de cada hora en punto.
create table if not exists trainer_availability (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references trainers (id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),   -- 1 = lunes (ISO)
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  constraint availability_range check (start_time < end_time),
  constraint availability_on_the_hour check (extract(minute from start_time) = 0 and extract(second from start_time) = 0
                                                  and extract(minute from end_time) = 0 and extract(second from end_time) = 0)
);
create unique index if not exists uq_availability_slot on trainer_availability (trainer_id, weekday, start_time);
alter table trainer_availability enable row level security;

-- Anti-solapamiento: un horario ocupado (pending o confirmed) por entrenador. La
-- segunda solicitud simultánea falla acá con 23505 y el backend responde 409.
create unique index if not exists uq_appointments_trainer_slot
  on appointments (trainer_id, scheduled_at) where status <> 'cancelled';

-- Reemplazo atómico de la disponibilidad (supabase-js no tiene transacciones).
create or replace function replace_trainer_availability(p_trainer uuid, p_slots jsonb)
returns setof trainer_availability language plpgsql security invoker set search_path = public as $$
begin
  delete from trainer_availability where trainer_id = p_trainer;
  insert into trainer_availability (trainer_id, weekday, start_time, end_time)
  select p_trainer, (s->>'weekday')::smallint, (s->>'start_time')::time, (s->>'end_time')::time
  from jsonb_array_elements(p_slots) s;
  return query select * from trainer_availability where trainer_id = p_trainer order by weekday, start_time;
end $$;
revoke all on function replace_trainer_availability(uuid, jsonb) from public, anon, authenticated;
grant execute on function replace_trainer_availability(uuid, jsonb) to service_role;

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

-- Un aviso de récords y uno de "rutina modificada" por sesión y destinatario. Los disparadores
-- corren sin esperarse: si dos lotes de series de la misma sesión llegan juntos, el segundo insert
-- choca con este índice y notify lo ignora (no repite la fila ni el push).
create unique index if not exists uq_notifications_session
  on notifications (type, user_id, (data->>'session_id'))
  where type in ('pr', 'routine_modified');

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
