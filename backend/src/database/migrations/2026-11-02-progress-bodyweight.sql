-- ============================================================================
-- Tarjeta 52 (hallazgo de la suite) · Peso corporal en progreso. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (04-progress.sql).
--   · session_records ignora las series sin peso (actual_kg nulo o 0): la
--     primera sesión con carga después de sesiones de peso corporal es "la
--     primera vez" y no marca récord.
--   · exercise_progress devuelve max_kg null (no 0) en un día solo de peso corporal.
-- ============================================================================

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
    nullif(max(ss.actual_kg), 0) as max_kg,  -- día solo de peso corporal: null, no 0
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

-- Récords personales por sesión: devuelve (sesión, ejercicio) cuando el mejor
-- 1RM estimado (Epley; solo series completadas con 0 < reps <= 12 y kg > 0:
-- Epley sobreestima por encima de 12 reps y el peso corporal no tiene 1RM) de
-- esa sesión supera ESTRICTAMENTE al mejor de todas las sesiones anteriores del
-- alumno. La primera vez que hace un ejercicio con carga no cuenta (no hay anterior).
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
      and ss.completed and ss.actual_reps > 0 and ss.actual_reps <= 12
      and ss.actual_kg > 0  -- excluye nulo y 0 (peso corporal)
    group by s.id, s.started_at, ss.exercise_id
  )
  select b.sid, b.eid
  from best b
  where b.sid = any (p_session_ids)
    and b.e1rm > (select max(p.e1rm) from best p
                  where p.eid = b.eid and p.started < b.started);
$$;

revoke all on function exercise_progress(uuid, uuid, date, date)
  from public, anon, authenticated;
grant execute on function exercise_progress(uuid, uuid, date, date) to service_role;
revoke all on function session_records(uuid, uuid[]) from public, anon, authenticated;
grant execute on function session_records(uuid, uuid[]) to service_role;
