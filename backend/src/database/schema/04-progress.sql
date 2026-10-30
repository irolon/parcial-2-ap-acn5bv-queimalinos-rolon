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

-- Curva de carga por ejercicio (tarjeta 32). Cubre también las consultas solo por exercise_id.
create index if not exists idx_session_sets_exercise_session
  on session_sets (exercise_id, session_id);

-- ── Funciones de progreso (tarjeta 32) ───────────────────────────────────────
-- Agregan en la base las series completadas de un alumno por día calendario
-- argentino. security invoker + revoke: solo las ejecuta el backend (service_role).

-- Un punto por día: mejor peso, volumen, 1RM estimado (Epley) y totales.
create or replace function exercise_progress(
  p_student_id uuid,
  p_exercise_id uuid,
  p_from date default null,
  p_to date default null
)
returns table (
  "date" date,
  max_kg numeric,
  volume_kg numeric,
  e1rm_kg numeric,
  sets int,
  reps int
)
language sql stable security invoker
set search_path = public
as $$
  select
    (s.started_at at time zone 'America/Argentina/Buenos_Aires')::date as "date",
    max(ss.actual_kg) as max_kg,
    sum(ss.actual_reps * coalesce(ss.actual_kg, 0)) as volume_kg,
    max(case when ss.actual_reps > 12 then null  -- Epley sobreestima: no cuenta
             when coalesce(ss.actual_kg, 0) = 0 then null  -- peso corporal (el celular manda 0)
             when ss.actual_reps = 1 then ss.actual_kg
             else ss.actual_kg * (1 + ss.actual_reps / 30.0) end) as e1rm_kg,
    count(*)::int as sets,
    sum(ss.actual_reps)::int as reps
  from session_sets ss
  join sessions s on s.id = ss.session_id
  where s.student_id = p_student_id
    and ss.exercise_id = p_exercise_id
    and ss.completed
    and ss.actual_reps > 0
    and (p_from is null
         or (s.started_at at time zone 'America/Argentina/Buenos_Aires')::date >= p_from)
    and (p_to is null
         or (s.started_at at time zone 'America/Argentina/Buenos_Aires')::date <= p_to)
  group by 1
  order by 1;
$$;

-- Por ejercicio, el mayor peso de la sesión más reciente que lo contiene.
create or replace function last_session_kg(
  p_student_id uuid,
  p_exercise_ids uuid[]
)
returns table (exercise_id uuid, last_session_kg numeric)
language sql stable security invoker
set search_path = public
as $$
  select distinct on (ss.exercise_id)
    ss.exercise_id,
    max(ss.actual_kg) over (partition by ss.exercise_id, ss.session_id) as last_session_kg
  from session_sets ss
  join sessions s on s.id = ss.session_id
  where s.student_id = p_student_id
    and ss.exercise_id = any (p_exercise_ids)
    and ss.completed
    and ss.actual_reps > 0
  order by ss.exercise_id, s.started_at desc, ss.session_id;
$$;

revoke all on function exercise_progress(uuid, uuid, date, date)
  from public, anon, authenticated;
grant execute on function exercise_progress(uuid, uuid, date, date) to service_role;
revoke all on function last_session_kg(uuid, uuid[]) from public, anon, authenticated;
grant execute on function last_session_kg(uuid, uuid[]) to service_role;
