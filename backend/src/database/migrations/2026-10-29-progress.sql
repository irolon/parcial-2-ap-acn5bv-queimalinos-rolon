-- ============================================================================
-- Tarjeta 32 · Progress backend: índice + funciones de progreso. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (04-progress.sql).
-- ============================================================================

-- Curva de carga por ejercicio. Cubre también las consultas solo por exercise_id.
create index if not exists idx_session_sets_exercise_session
  on session_sets (exercise_id, session_id);

-- (exercise_id) es prefijo del índice nuevo: queda redundante.
drop index if exists idx_session_sets_exercise;

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
    max(case when ss.actual_reps = 1 then ss.actual_kg
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
