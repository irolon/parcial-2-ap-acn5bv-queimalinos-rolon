-- ============================================================================
-- FitTrainer — Chequeos del schema (2 de 2): índices, funciones, triggers, vistas y
-- columnas de las migraciones más nuevas. Cero filas = bien. Correr también el 1 de 2.
-- ============================================================================
select 'falta el índice idx_session_sets_exercise_session'
where to_regclass('public.idx_session_sets_exercise_session') is null

union all
select 'falta la función ' || f
from (values ('exercise_progress'), ('last_session_kg'), ('progress_exercises'), ('weekly_volume'),
        ('replace_trainer_availability'), ('save_ai_generation_templates')) v (f)
where not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = v.f
)

union all
select 'falta la columna ai_routine_generations.routine_template_ids (2026-11-06-trainer-ai-templates.sql)'
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'ai_routine_generations'
    and column_name = 'routine_template_ids' and is_nullable = 'NO'
)

union all
select 'falta la columna chat_messages.' || c || ' (2026-11/09-15/2026-11-09-chat-history.sql)'
from (values ('exercise_id'), ('suggestions')) v (c)
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'chat_messages' and column_name = v.c
)

union all
select 'falta el índice uq_appointments_trainer_slot'
where to_regclass('public.uq_appointments_trainer_slot') is null

union all
select 'falta el check ' || c || ' en appointments'
from (values ('appointments_duration_60'), ('appointments_on_the_hour')) v (c)
where not exists (
  select 1 from pg_constraint where conrelid = to_regclass('public.appointments') and conname = v.c
)

union all
select 'falta el trigger appointments_student_active'
where not exists (
  select 1 from pg_trigger
  where tgrelid = to_regclass('public.appointments') and tgname = 'appointments_student_active' and not tgisinternal
)

union all
select 'falta la vista student_last_session'
where to_regclass('public.student_last_session') is null

union all
select 'la vista student_last_session debería tener security_invoker = true'
from pg_class
where oid = to_regclass('public.student_last_session')
  and not coalesce('security_invoker=true' = any (reloptions), false)

union all
select 'la vista student_last_session debería contar solo sesiones terminadas (falta 2026-11-09-open-sessions.sql)'
where to_regclass('public.student_last_session') is not null
  and pg_get_viewdef('public.student_last_session'::regclass) not like '%finished_at IS NOT NULL%'

union all
select 'falta la vista routine_templates_summary con security_invoker = true (falta 2026-11-14-listado-plantillas.sql)'
where not exists (select 1 from pg_class where oid = to_regclass('public.routine_templates_summary')
  and 'security_invoker=true' = any (reloptions))

union all
select 'falta el índice idx_sessions_open (falta 2026-11-09-open-sessions.sql)'
where to_regclass('public.idx_sessions_open') is null

union all
select format('falta la columna %s.%s', v.t, v.c)
from (values ('invitations', 'student_gym_equipment'), ('invitations', 'student_injuries'),
  ('invitations', 'student_level'), ('invitations', 'template_id'), ('invitations', 'routine_days'),
  -- Datos extra al invitar (falta 2026-11-14-invitar-extras.sql):
  ('invitations', 'student_weekly_frequency'), ('invitations', 'student_height_cm'),
  ('invitations', 'student_weight_kg'), ('invitations', 'student_birth_date'),
  ('students', 'weekly_frequency')) v (t, c)
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = v.t and column_name = v.c
)

union all
select 'falta la función session_records(uuid, uuid[])'
where to_regprocedure('public.session_records(uuid, uuid[])') is null

union all
select 'session_records debería ignorar el peso corporal (falta 2026-11-02-progress-bodyweight.sql)'
from pg_proc
where oid = to_regprocedure('public.session_records(uuid, uuid[])')
  and prosrc not like '%actual_kg > 0%'

union all
select 'exercise_progress debería devolver max_kg null en peso corporal (falta 2026-11-02-progress-bodyweight.sql)'
from pg_proc
where oid = to_regprocedure('public.exercise_progress(uuid, uuid, date, date)')
  and prosrc not like '%nullif(max(ss.actual_kg), 0)%'

union all
select 'falta la columna routines.level (falta 2026-11-09-routine-level-initial-template.sql)'
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'routines' and column_name = 'level'
)

union all
select 'notifications.type debería aceptar initial_routine_failed (falta 2026-11-09-routine-level-initial-template.sql)'
from pg_constraint
where conname = 'notifications_type_check'
  and pg_get_constraintdef(oid) not like '%initial_routine_failed%';
