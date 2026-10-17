-- ============================================================================
-- FitTrainer — Schema 05 · achievements, student_achievements, challenges,
-- student_challenges. Va después de 04-progress.sql. Re-ejecutable.
-- ============================================================================

-- ── achievements (Fase 5 · catálogo global de logros) ────────────────────────
create table if not exists achievements (
  id          uuid primary key default gen_random_uuid(),
  code        varchar(50) not null unique,
  name        varchar(100) not null,
  description text,
  icon_url    text,
  category    varchar(20) check (category in ('streak', 'volume', 'consistency', 'pr', 'milestone')),
  criteria    jsonb not null default '{}'
);

-- ── student_achievements ─────────────────────────────────────────────────────
create table if not exists student_achievements (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students (id) on delete cascade,
  achievement_id uuid not null references achievements (id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  context        jsonb,
  unique (student_id, achievement_id)
);

-- ── challenges (trainer_id null = global) ────────────────────────────────────
create table if not exists challenges (
  id                    uuid primary key default gen_random_uuid(),
  trainer_id            uuid references trainers (id) on delete cascade,
  name                  varchar(100) not null,
  description           text,
  goal_type             varchar(20) check (goal_type in ('sessions_count', 'weight_target', 'streak', 'volume')),
  goal_value            numeric not null,
  duration_days         int check (duration_days > 0),
  reward_achievement_id uuid references achievements (id) on delete set null
);

create index if not exists idx_challenges_trainer on challenges (trainer_id);

-- ── student_challenges ───────────────────────────────────────────────────────
create table if not exists student_challenges (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students (id) on delete cascade,
  challenge_id     uuid not null references challenges (id) on delete cascade,
  started_at       timestamptz not null default now(),
  ends_at          timestamptz not null,
  current_progress numeric not null default 0,
  status           varchar(20) not null default 'active'
                   check (status in ('active', 'completed', 'failed', 'abandoned')),
  completed_at     timestamptz
);

create index if not exists idx_student_challenges_student on student_challenges (student_id);

