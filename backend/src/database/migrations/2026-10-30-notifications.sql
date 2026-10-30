-- ============================================================================
-- Tarjeta 44 · Notificaciones (push con FCM). Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (06-ai-and-agenda.sql y 07-rls.sql).
-- ============================================================================

-- Contexto de la notificación (student_id, session_id, achievement_code…) y
-- marca de que algún push salió. Sin reintentos: la tabla es la fuente de verdad.
alter table notifications add column if not exists data jsonb not null default '{}';
alter table notifications add column if not exists push_sent_at timestamptz;

-- Límite semanal de avisos de inactividad por alumno.
create index if not exists idx_notifications_inactivity
  on notifications ((data->>'student_id'), created_at desc) where type = 'inactivity';

-- ── push_tokens ──────────────────────────────────────────────────────────────
-- user_id apunta a trainers o students según user_role (sin FK dura, como notifications).
create table if not exists push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  user_role    varchar(20) not null check (user_role in ('trainer', 'student')),
  token        text not null unique,
  platform     varchar(10) not null check (platform in ('android', 'web')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_push_tokens_user on push_tokens (user_id);

-- RLS activado sin políticas, como el resto de las tablas (ADR 0001).
alter table push_tokens enable row level security;
