-- ============================================================================
-- GX1 · Cuenta: cambiar contraseña y blanqueo por el PT. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/
-- (01-auth.sql y 02-students.sql).
-- ============================================================================

-- El PT blanquea la clave del alumno con una temporal: con el flag prendido el
-- backend responde 403 PASSWORD_CHANGE_REQUIRED hasta que elija una nueva.
alter table students
  add column if not exists must_change_password boolean not null default false;

-- Última vez que se cambió (o blanqueó) la clave, para "Modificada hace…".
-- Null = nunca la cambiaron desde el alta.
alter table students
  add column if not exists password_changed_at timestamptz;
alter table trainers
  add column if not exists password_changed_at timestamptz;
