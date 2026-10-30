-- ============================================================================
-- Tarjeta 41 · Gamificación backend. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (05-gamification.sql y 07-rls.sql).
-- Después, correr los seeds seeds/achievements.sql y seeds/challenges.sql.
-- ============================================================================

-- ── student_streaks (tarjeta 41 · racha recalculada desde el historial) ──────
create table if not exists student_streaks (
  student_id        uuid primary key references students (id) on delete cascade,
  current_days      int not null default 0,
  longest_days      int not null default 0,
  last_trained_date date,
  updated_at        timestamptz not null default now()
);

-- Un alumno no puede tener el mismo desafío activo dos veces.
create unique index if not exists uq_student_challenges_active
  on student_challenges (student_id, challenge_id) where status = 'active';

-- RLS activado sin políticas, como el resto de las tablas (ADR 0001).
alter table student_streaks enable row level security;
