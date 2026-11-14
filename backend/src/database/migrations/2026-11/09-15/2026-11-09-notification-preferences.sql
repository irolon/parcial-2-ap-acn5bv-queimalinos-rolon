-- ============================================================================
-- GX3 · Preferencias de notificación del alumno. Re-ejecutable.
-- Correr en el SQL Editor de Supabase. También está en database/schema/
-- (06-ai-and-agenda/02-agenda-and-notifications.sql y 07-rls.sql).
-- ============================================================================

-- Una fila por alumno, una columna por tipo. Sin fila = todo prendido.
-- Solo decide el push: la fila de notifications se guarda igual.
create table if not exists notification_preferences (
  student_id  uuid primary key references students (id) on delete cascade,
  message     boolean not null default true,
  comment     boolean not null default true,
  appointment boolean not null default true,
  pr          boolean not null default true,
  achievement boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table notification_preferences enable row level security;

notify pgrst, 'reload schema';
