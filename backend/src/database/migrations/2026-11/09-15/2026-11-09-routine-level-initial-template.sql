-- ============================================================================
-- GX8 · Nivel de la rutina y plantilla inicial al invitar.
-- Re-ejecutable y aditiva. Correr en el SQL Editor de Supabase (o vía MCP). También
-- está en database/schema/ (03-routines.sql y 06-ai-and-agenda/02-agenda-and-notifications.sql). La usan
-- POST/PATCH /routines, POST /invitations y POST /students.
-- ============================================================================

-- Nivel de la rutina (opcional: null = sin definir), con los valores de las plantillas.
alter table routines add column if not exists level varchar(20)
  check (level in ('beginner', 'intermediate', 'advanced'));

-- Plantilla inicial de la invitación: se valida al invitar y se copia al alta.
-- set null: si se borra la plantilla, el alta crea al alumno sin rutina.
alter table invitations add column if not exists template_id uuid
  references routine_templates (id) on delete set null;

-- Días de la plantilla inicial; null = los de la plantilla al momento del alta.
alter table invitations add column if not exists routine_days text[]
  check (routine_days <@ array['sunday','monday','tuesday','wednesday','thursday','friday','saturday']::text[]);

-- Aviso al PT cuando la rutina inicial no se pudo crear en el alta.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'inactivity', 'appointment', 'comment', 'pr', 'achievement', 'routine_modified',
  'initial_routine_failed'
));

notify pgrst, 'reload schema';
