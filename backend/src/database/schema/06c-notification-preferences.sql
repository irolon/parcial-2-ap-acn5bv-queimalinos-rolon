-- ============================================================================
-- FitTrainer — Schema 06c · notification_preferences (preferencias de push del
-- alumno, GX3). Va después de 06b-messages.sql y antes de 07-rls.sql.
-- Re-ejecutable.
-- ============================================================================

-- ── notification_preferences ────────────────────────────────────────────────
-- Una fila por alumno, una columna por tipo. Sin fila = todo prendido.
-- Solo decide el push: la fila de notifications se guarda igual.
-- Sin índice extra: la PK es el único acceso.
create table if not exists notification_preferences (
  student_id  uuid primary key references students (id) on delete cascade,
  message     boolean not null default true,
  comment     boolean not null default true,
  appointment boolean not null default true,
  pr          boolean not null default true,
  achievement boolean not null default true,
  updated_at  timestamptz not null default now()
);
