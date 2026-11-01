-- ============================================================================
-- Tarjeta 48 · Mensajería interna. Re-ejecutable.
-- Correr en el SQL Editor de Supabase. También está en database/schema/ (06b-messages.sql y 07-rls.sql).
-- ============================================================================

-- ── messages (mensajería interna PT ↔ alumno) ───────────────────────────────
-- El PT de la conversación es students.trainer_id: no se guarda en el mensaje.
-- image_path: <student_id>/<uuid>.<ext> dentro del bucket message-images; nunca sale en la API.
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students (id) on delete cascade,
  sender_role  varchar(10) not null check (sender_role in ('trainer', 'student')),
  body         text check (body is null or char_length(body) between 1 and 2000),
  image_path   text,
  broadcast_id uuid,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint messages_not_empty check (body is not null or image_path is not null)
);

create index if not exists idx_messages_student_created on messages (student_id, created_at desc);
create index if not exists idx_messages_unread on messages (student_id, sender_role) where read_at is null;

-- RLS activado sin políticas, como el resto de las tablas (ADR 0001).
alter table messages enable row level security;

-- ── Bucket privado de fotos de mensajes ──────────────────────────────────────
-- Sin acceso del browser: el backend sube y firma las URLs con la service_role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-images', 'message-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
