-- ============================================================================
-- Tarjeta 44 · Notificaciones (push con FCM). Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (06-ai-and-agenda.sql y 07-rls.sql).
-- ============================================================================

-- Contexto de la notificación (student_id, session_id, achievement_code…) y
-- marca de que algún push salió. Sin reintentos: la tabla es la fuente de verdad.
alter table notifications add column if not exists data jsonb not null default '{}';
alter table notifications add column if not exists push_sent_at timestamptz;

-- Avisos de inactividad recientes (el job los consulta por tipo y fecha).
drop index if exists idx_notifications_inactivity;
create index if not exists idx_notifications_inactivity
  on notifications (created_at desc) where type = 'inactivity';

-- Un aviso de récords y uno de "rutina modificada" por sesión y destinatario. Los disparadores
-- corren sin esperarse: si dos lotes de series de la misma sesión llegan juntos, el segundo insert
-- choca con este índice y notify lo ignora (no repite la fila ni el push).
create unique index if not exists uq_notifications_session
  on notifications (type, user_id, (data->>'session_id'))
  where type in ('pr', 'routine_modified');

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
