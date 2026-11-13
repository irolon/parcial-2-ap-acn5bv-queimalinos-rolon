-- ============================================================================
-- Tarjeta 7 · Students + Body Metrics. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (04-progress.sql).
-- ============================================================================

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

-- Última sesión de cada alumno, para el listado del trainer (GET /students).
-- security_invoker: la vista aplica el RLS de sessions a quien la consulta.
-- Sin esto correría con los permisos de su dueño (postgres) y la anon key
-- podría leer las fechas de sesión de cualquier alumno. El backend usa la
-- service_role, que bypasea RLS igual.
create or replace view student_last_session with (security_invoker = true) as
  select student_id, max(started_at) as last_session_at
  from sessions
  group by student_id;

-- invitations: contexto para los asistentes IA (S4) que el trainer carga en el
-- alta y se copia al alumno al aceptar la invitación (igual que student_goal).
alter table invitations add column if not exists student_gym_equipment text[];
alter table invitations add column if not exists student_injuries text;
alter table invitations add column if not exists student_level varchar(20)
  check (student_level in ('beginner', 'intermediate', 'advanced'));
