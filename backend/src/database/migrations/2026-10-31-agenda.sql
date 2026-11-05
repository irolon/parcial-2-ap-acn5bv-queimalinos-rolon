-- ============================================================================
-- Tarjeta 46 · Agenda: disponibilidad semanal y turnos sin solapamiento.
-- Re-ejecutable. Correr en el SQL Editor de Supabase (o vía MCP). También está en
-- database/schema/ (06-ai-and-agenda.sql). Requiere appointments (06) y trainers (01).
-- ============================================================================

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
