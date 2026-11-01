-- ============================================================================
-- FitTrainer — Schema 07 · Row Level Security de todas las tablas. Va último,
-- después de 06-ai-and-agenda.sql. Re-ejecutable.
-- ============================================================================

-- ── Row Level Security ───────────────────────────────────────────────────────
-- RLS activado SIN políticas en todas las tablas: anon y authenticated no ven
-- ninguna fila por la API REST de Supabase. El backend usa la service_role,
-- que bypasea RLS. Ver docs/adr/0001-autorizacion-en-services-rls-deny-all.md.
-- NO agregar "create policy" sin actualizar ese ADR.
alter table trainers               enable row level security;
alter table refresh_tokens         enable row level security;
alter table students               enable row level security;
alter table body_metrics           enable row level security;
alter table invitations            enable row level security;
alter table exercises              enable row level security;
alter table routine_templates      enable row level security;
alter table routines               enable row level security;
alter table routine_exercises      enable row level security;
alter table sessions               enable row level security;
alter table session_sets           enable row level security;
alter table achievements           enable row level security;
alter table student_achievements   enable row level security;
alter table challenges             enable row level security;
alter table student_challenges     enable row level security;
alter table student_streaks        enable row level security;
alter table chat_messages          enable row level security;
alter table ai_routine_generations enable row level security;
alter table appointments           enable row level security;
alter table trainer_availability  enable row level security;
alter table notifications          enable row level security;
alter table push_tokens            enable row level security;
