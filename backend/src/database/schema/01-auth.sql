-- ============================================================================
-- FitTrainer — Schema 01 · auth: extensión pgcrypto, trainers, refresh_tokens.
-- Va primero; los archivos 02 a 07 se corren después, en orden. Re-ejecutable:
-- todo usa "if not exists" y los alter van en bloques idempotentes.
--
-- Seguridad: RLS activado en todas las tablas y SIN políticas (ver
-- docs/adr/0001-autorizacion-en-services-rls-deny-all.md). El backend usa la
-- SERVICE ROLE key, que bypasea RLS, y valida ownership/rol en la capa Service.
-- ============================================================================


create extension if not exists "pgcrypto";

-- ── trainers ────────────────────────────────────────────────────────────────
-- Agrega password_hash respecto del DER original: el modelo de datos no
-- contemplaba credenciales y la autenticación por email/password lo requiere.
create table if not exists trainers (
  id            uuid primary key default gen_random_uuid(),
  name          varchar(100) not null,
  email         varchar(255) not null unique,
  password_hash varchar(255) not null,
  specialty     varchar(255),
  avatar_url    text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_trainers_email on trainers (email);

-- ── refresh_tokens ───────────────────────────────────────────────────────────
-- Tabla nueva (no estaba en el DER). Permite revocar refresh tokens en el
-- logout y rotarlos. Se persiste solo el hash SHA-256 del token, nunca el valor.
-- user_id referencia a trainers o students según 'role' (no hay FK dura porque
-- apunta a dos tablas distintas).
create table if not exists refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  role       varchar(20) not null check (role in ('trainer', 'student')),
  token_hash varchar(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_refresh_tokens_hash on refresh_tokens (token_hash);
create index if not exists idx_refresh_tokens_user on refresh_tokens (user_id);

