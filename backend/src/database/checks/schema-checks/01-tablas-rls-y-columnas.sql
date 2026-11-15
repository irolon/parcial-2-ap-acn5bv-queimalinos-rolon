-- ============================================================================
-- FitTrainer — Chequeos del schema (1 de 2): tablas, RLS, políticas, FKs, not null y
-- columnas. Cero filas = bien. Correr los dos archivos de esta carpeta en el SQL Editor
-- de Supabase (o vía MCP execute_sql), cada uno como una consulta aparte.
-- ============================================================================
with expected (t) as (
  values ('trainers'), ('refresh_tokens'), ('students'), ('body_metrics'),
         ('invitations'), ('exercises'), ('routine_templates'), ('routines'),
         ('routine_exercises'), ('sessions'), ('session_sets'),
         ('achievements'), ('student_achievements'), ('challenges'),
         ('student_challenges'), ('student_streaks'), ('chat_messages'),
         ('ai_routine_generations'), ('appointments'), ('notifications'),
         ('push_tokens'), ('trainer_availability'), ('messages'),
         ('notification_preferences')
)
select 'falta la tabla ' || t as problema
from expected e
where to_regclass('public.' || e.t) is null

union all
select 'RLS desactivado en ' || tablename
from pg_tables
where schemaname = 'public' and not rowsecurity

union all
select 'no debería haber políticas: ' || tablename || '.' || policyname
from pg_policies
where schemaname = 'public'

union all
-- on delete esperado: n = set null, c = cascade
select format('%s.%s: on delete debería ser %s', v.tbl, v.col, v.expected)
from (values
  ('routines',      'template_id',         'n'),
  ('sessions',      'routine_id',          'n'),
  ('session_sets',  'session_id',          'c'),
  ('session_sets',  'routine_exercise_id', 'n'),
  ('chat_messages', 'session_id',          'n'),
  ('chat_messages', 'exercise_id',         'n')
) v (tbl, col, expected)
where not exists (
  select 1
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.contype = 'f'
    and c.conrelid = to_regclass('public.' || v.tbl)
    and a.attname = v.col
    and c.confdeltype = v.expected
)

union all
select format('%s.%s debería ser not null', v.tbl, v.col)
from (values
  ('session_sets',  'exercise_id'),
  ('session_sets',  'executed_at'),
  ('notifications', 'user_role'),
  ('notifications', 'data'),
  ('push_tokens',   'user_role'),
  ('push_tokens',   'token')
) v (tbl, col)
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = v.tbl
    and column_name = v.col and is_nullable = 'NO'
)

union all
select 'falta la columna session_sets.rest_seconds'
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'session_sets'
    and column_name = 'rest_seconds'
)

union all
select 'falta la columna notifications.push_sent_at'
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'notifications'
    and column_name = 'push_sent_at'
)

union all
select 'falta la columna body_metrics.recorded_by'
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'body_metrics'
    and column_name = 'recorded_by'
);
