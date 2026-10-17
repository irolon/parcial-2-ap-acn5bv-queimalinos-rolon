-- ============================================================================
-- FitTrainer — Schema 02 · students, invitations. Va después de 01-auth.sql.
-- Re-ejecutable.
-- ============================================================================

-- ── students ─────────────────────────────────────────────────────────────────
-- Agrega password_hash respecto del DER (igual que trainers: el login del
-- alumno por email/password lo requiere). Se crea acá porque es el destino del
-- onboarding (CU-02) y el target del chequeo de email de las invitaciones.
create table if not exists students (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null references trainers (id) on delete cascade,
  name          varchar(100) not null,
  email         varchar(255) not null unique,
  password_hash varchar(255),
  goal          varchar(20) check (goal in ('tonify', 'weight_loss', 'hypertrophy', 'strength')),
  birth_date    date,
  avatar_url    text,
  active        boolean not null default true,
  gym_equipment text[],
  injuries      text,
  level         varchar(20) check (level in ('beginner', 'intermediate', 'advanced')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_students_trainer on students (trainer_id);
create index if not exists idx_students_email on students (email);

-- ── invitations ──────────────────────────────────────────────────────────────
-- Agrega student_email respecto del DER: el contrato de API lo requiere
-- (POST /invitations lo recibe y GET /invitations/:token lo devuelve).
create table if not exists invitations (
  id               uuid primary key default gen_random_uuid(),
  trainer_id       uuid not null references trainers (id) on delete cascade,
  token            varchar(64) not null unique,
  student_name     varchar(100) not null,
  student_email    varchar(255) not null,
  student_phone    varchar(30),
  student_goal     varchar(20) check (student_goal in ('tonify', 'weight_loss', 'hypertrophy', 'strength')),
  delivery_channel varchar(20) not null check (delivery_channel in ('whatsapp', 'qr', 'both')),
  expires_at       timestamptz not null,
  used_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_invitations_token on invitations (token);
create index if not exists idx_invitations_trainer on invitations (trainer_id);

-- invitations: contexto para los asistentes IA (S4) que el trainer carga en el
-- alta y se copia al alumno al aceptar la invitación (igual que student_goal).
alter table invitations add column if not exists student_gym_equipment text[];
alter table invitations add column if not exists student_injuries text;
alter table invitations add column if not exists student_level varchar(20)
  check (student_level in ('beginner', 'intermediate', 'advanced'));

