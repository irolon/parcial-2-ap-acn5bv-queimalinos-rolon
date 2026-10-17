-- ============================================================================
-- FitTrainer — Chequeos del schema. Cero filas = schema completo y seguro.
-- Ejecutar en el SQL Editor de Supabase (o vía MCP execute_sql).
-- ============================================================================
with expected (t) as (
  values ('trainers'), ('refresh_tokens'), ('students'), ('body_metrics'),
         ('invitations'), ('exercises'), ('routine_templates'), ('routines'),
         ('routine_exercises'), ('sessions'), ('session_sets'),
         ('achievements'), ('student_achievements'), ('challenges'),
         ('student_challenges'), ('chat_messages'),
         ('ai_routine_generations'), ('appointments'), ('notifications')
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
  ('chat_messages', 'session_id',          'n')
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
  ('notifications', 'user_role')
) v (tbl, col)
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = v.tbl
    and column_name = v.col and is_nullable = 'NO'
);
