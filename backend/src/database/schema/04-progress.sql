-- ============================================================================
-- FitTrainer — Schema 04 · body_metrics, sessions, student_last_session
-- (vista), session_sets. Va después de 03-routines.sql. Re-ejecutable.
-- ============================================================================

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

-- Última sesión de cada alumno, para el listado del trainer (GET /students).
-- security_invoker: la vista aplica el RLS de sessions a quien la consulta.
-- Sin esto correría con los permisos de su dueño (postgres) y la anon key
-- podría leer las fechas de sesión de cualquier alumno. El backend usa la
-- service_role, que bypasea RLS igual.
create or replace view student_last_session with (security_invoker = true) as
  select student_id, max(started_at) as last_session_at
  from sessions
  group by student_id;

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


-- ── session_records (tarjeta 33) ─────────────────────────────────────────────
-- Récords personales por sesión: devuelve (sesión, ejercicio) cuando el mejor
-- 1RM estimado (Epley; solo series completadas con reps > 0 y kg no nulo) de
-- esa sesión supera ESTRICTAMENTE al mejor de todas las sesiones anteriores del
-- alumno. La primera vez que hace un ejercicio no cuenta (no hay anterior).
create or replace function session_records(p_student_id uuid, p_session_ids uuid[])
returns table (session_id uuid, exercise_id uuid)
language sql stable security invoker set search_path = public
as $$
  with best as (
    select s.id as sid, s.started_at as started, ss.exercise_id as eid,
           max(case when ss.actual_reps = 1 then ss.actual_kg
                    else ss.actual_kg * (1 + ss.actual_reps / 30.0) end) as e1rm
    from sessions s
    join session_sets ss on ss.session_id = s.id
    where s.student_id = p_student_id
      and ss.completed and ss.actual_reps > 0 and ss.actual_kg is not null
    group by s.id, s.started_at, ss.exercise_id
  )
  select b.sid, b.eid
  from best b
  where b.sid = any (p_session_ids)
    and b.e1rm > (select max(p.e1rm) from best p
                  where p.eid = b.eid and p.started < b.started);
$$;

revoke all on function session_records(uuid, uuid[]) from public, anon, authenticated;
grant execute on function session_records(uuid, uuid[]) to service_role;
