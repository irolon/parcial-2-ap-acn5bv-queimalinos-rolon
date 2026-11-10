-- ============================================================================
-- FitTrainer — Schema 06 (2/2) · appointments, trainer_availability,
-- notifications, push_tokens y notification_preferences (GX3). Va después de
-- 06-ai-and-agenda/01-ai.sql. Re-ejecutable.
-- ============================================================================

-- ── appointments (Fase 6 · turnos PT–alumno) ─────────────────────────────────
create table if not exists appointments (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null references trainers (id) on delete cascade,
  student_id   uuid not null references students (id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_min int not null default 60 constraint appointments_duration_60 check (duration_min = 60),
  status       varchar(20) not null default 'pending'
               check (status in ('pending', 'confirmed', 'cancelled')),
  notes        text,
  created_at   timestamptz not null default now(),
  -- Tarjeta 46: hora en punto (en UTC; Argentina es UTC-3 fijo, da lo mismo).
  constraint appointments_on_the_hour check (mod(extract(epoch from scheduled_at), 3600) = 0)
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

-- Anti-solapamiento: un horario ocupado (pending o confirmed) por entrenador. La
-- segunda solicitud simultánea falla acá con 23505 y el backend responde 409.
create unique index if not exists uq_appointments_trainer_slot
  on appointments (trainer_id, scheduled_at) where status <> 'cancelled';

-- Reemplazo atómico de la disponibilidad (supabase-js no tiene transacciones). El
-- advisory lock por PT pone en fila dos guardados simultáneos (2026-11-01-agenda-followup.sql).
create or replace function replace_trainer_availability(p_trainer uuid, p_slots jsonb)
returns setof trainer_availability language plpgsql security invoker set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_trainer::text));
  delete from trainer_availability where trainer_id = p_trainer;
  insert into trainer_availability (trainer_id, weekday, start_time, end_time)
  select p_trainer, (s->>'weekday')::smallint, (s->>'start_time')::time, (s->>'end_time')::time
  from jsonb_array_elements(p_slots) s;
  return query select * from trainer_availability where trainer_id = p_trainer order by weekday, start_time;
end $$;
revoke all on function replace_trainer_availability(uuid, jsonb) from public, anon, authenticated;
grant execute on function replace_trainer_availability(uuid, jsonb) to service_role;

-- Ningún turno nuevo para un alumno dado de baja, ni siquiera un alta en vuelo
-- durante la baja: `for share` la pone en fila con el UPDATE de la baja, que
-- después cancela los turnos futuros (2026-11-01-agenda-inactive-student.sql).
create or replace function appointments_student_active()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  is_active boolean;
begin
  select active into is_active from students where id = new.student_id for share;
  if is_active is distinct from true then
    raise exception 'El alumno está dado de baja' using errcode = 'FT001';
  end if;
  return new;
end $$;
revoke all on function appointments_student_active() from public, anon, authenticated;
drop trigger if exists appointments_student_active on appointments;
create trigger appointments_student_active
  before insert on appointments
  for each row execute function appointments_student_active();

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

-- ── notification_preferences (GX3) ──────────────────────────────────────────
-- Una fila por alumno, una columna por tipo. Sin fila = todo prendido.
-- Solo decide el push: la fila de notifications se guarda igual.
-- Sin índice extra: la PK es el único acceso.
create table if not exists notification_preferences (
  student_id  uuid primary key references students (id) on delete cascade,
  message     boolean not null default true,
  comment     boolean not null default true,
  appointment boolean not null default true,
  pr          boolean not null default true,
  achievement boolean not null default true,
  updated_at  timestamptz not null default now()
);
