-- ============================================================================
-- Tarjeta 33 · Historial de sesiones. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (04-progress.sql).
-- sessions.trainer_comment ya existe en el schema base.
-- ============================================================================

-- ── session_records (tarjeta 33) ─────────────────────────────────────────────
-- Récords personales por sesión: devuelve (sesión, ejercicio) cuando el mejor
-- 1RM estimado (Epley; solo series completadas con 0 < reps <= 12 y kg no nulo:
-- Epley sobreestima por encima de 12 reps) de
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
      and ss.completed and ss.actual_reps > 0 and ss.actual_reps <= 12
      and ss.actual_kg is not null
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
