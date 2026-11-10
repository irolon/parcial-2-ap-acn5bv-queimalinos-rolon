-- ============================================================================
-- Tarjeta 34 · Vista de progreso web: funciones progress_exercises y weekly_volume.
-- Re-ejecutable. Correr en el SQL Editor de Supabase (o vía MCP). También está en
-- database/schema/ (04b-progress-overview.sql). Requiere 04-progress.sql.
-- ============================================================================

-- ── Overview de progreso (tarjeta 34) ────────────────────────────────────────
-- Ejercicios entrenados y volumen semanal de un alumno, por día calendario
-- argentino. Cuentan las series completadas con repeticiones (misma regla que
-- exercise_progress). security invoker + revoke: solo las ejecuta el backend.

-- Ejercicios con al menos una serie que cuenta, con sus días distintos y el último.
create or replace function progress_exercises(p_student_id uuid)
returns table (
  exercise_id uuid,
  name text,
  muscle_group text,
  days int,
  last_date date
)
language sql stable security invoker
set search_path = public
as $$
  select
    e.id as exercise_id,
    e.name,
    e.muscle_group::text as muscle_group,
    count(distinct (s.started_at at time zone 'America/Argentina/Buenos_Aires')::date)::int as days,
    max((s.started_at at time zone 'America/Argentina/Buenos_Aires')::date) as last_date
  from session_sets ss
  join sessions s on s.id = ss.session_id
  join exercises e on e.id = ss.exercise_id
  where s.student_id = p_student_id
    and ss.completed
    and ss.actual_reps > 0
  group by e.id, e.name, e.muscle_group
  order by last_date desc, e.name;
$$;

-- Una fila por semana (lunes, hora argentina), con las vacías en 0. Sin p_from
-- arranca en la semana de la primera sesión; sin p_to termina en la semana actual.
create or replace function weekly_volume(
  p_student_id uuid,
  p_from date default null,
  p_to date default null
)
returns table (
  week_start date,
  volume_kg numeric,
  sessions int
)
language sql stable security invoker
set search_path = public
as $$
  with counted as (
    select
      ss.session_id,
      (s.started_at at time zone 'America/Argentina/Buenos_Aires')::date as local_date,
      ss.actual_reps * coalesce(ss.actual_kg, 0) as volume
    from session_sets ss
    join sessions s on s.id = ss.session_id
    where s.student_id = p_student_id
      and ss.completed
      and ss.actual_reps > 0
  ),
  by_week as (
    select
      date_trunc('week', local_date::timestamp)::date as week_start,
      sum(volume) as volume_kg,
      count(distinct session_id)::int as sessions
    from counted
    group by 1
  ),
  bounds as (
    select
      date_trunc('week', coalesce(p_from, (select min(local_date) from counted))::timestamp) as first_week,
      date_trunc('week', coalesce(
        p_to, (now() at time zone 'America/Argentina/Buenos_Aires')::date
      )::timestamp) as last_week
  )
  select
    w.week::date as week_start,
    coalesce(bw.volume_kg, 0) as volume_kg,
    coalesce(bw.sessions, 0) as sessions
  from bounds b
  cross join lateral generate_series(b.first_week, b.last_week, interval '7 days') as w (week)
  left join by_week bw on bw.week_start = w.week::date
  order by 1;
$$;

revoke all on function progress_exercises(uuid) from public, anon, authenticated;
grant execute on function progress_exercises(uuid) to service_role;
revoke all on function weekly_volume(uuid, date, date) from public, anon, authenticated;
grant execute on function weekly_volume(uuid, date, date) to service_role;
