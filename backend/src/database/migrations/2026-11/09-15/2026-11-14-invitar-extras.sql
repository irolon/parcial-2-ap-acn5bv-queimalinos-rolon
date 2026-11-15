-- ============================================================================
-- Deseable · Datos extra al invitar un alumno: frecuencia, altura, peso y nacimiento.
-- Re-ejecutable y aditiva. Correr en el SQL Editor de Supabase (o vía MCP) ANTES de
-- deployar el backend que la usa. También está en database/schema/02-students.sql.
-- La usan POST /invitations, POST /students (alta) y GET/PATCH /students/:id.
-- ============================================================================

-- Invitación: se cargan al invitar y se copian al alta. Todas opcionales (null = sin dato).
alter table invitations add column if not exists student_weekly_frequency smallint
  check (student_weekly_frequency between 1 and 7);
alter table invitations add column if not exists student_height_cm numeric
  check (student_height_cm between 50 and 250);
alter table invitations add column if not exists student_weight_kg numeric
  check (student_weight_kg between 20 and 300);
alter table invitations add column if not exists student_birth_date date;

-- Alumno: días por semana que quiere entrenar (el nacimiento ya existía en students.birth_date;
-- altura y peso van como primera fila de body_metrics).
alter table students add column if not exists weekly_frequency smallint
  check (weekly_frequency between 1 and 7);

notify pgrst, 'reload schema';
