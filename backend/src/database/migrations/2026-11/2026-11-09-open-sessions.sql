-- ============================================================================
-- GX4 (sesión en curso) · Sesiones abiertas.
-- Re-ejecutable y aditiva. Correr en el SQL Editor de Supabase (o vía MCP). También
-- está en database/schema/ (04-progress.sql). Las apps crean la sesión al empezar
-- (POST /sessions sin finished_at): una abierta no es una sesión hecha.
-- ============================================================================

-- "Última sesión" (GET /students, la ficha, días sin entrenar del overview): solo terminadas.
create or replace view student_last_session with (security_invoker = true) as
  select student_id, max(started_at) as last_session_at
  from sessions
  where finished_at is not null
  group by student_id;

-- Sesiones abiertas de las últimas 4 h por alumno (open_session de GET /students e
-- in_session de GET /students/overview).
create index if not exists idx_sessions_open
  on sessions (student_id, started_at desc)
  where finished_at is null;

notify pgrst, 'reload schema';
