-- ============================================================================
-- Tarjeta 1 · Seed de ejercicios. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (03-routines.sql).
-- ============================================================================

-- Un nombre no se repite entre los globales; hace idempotente el seed (on conflict).
create unique index if not exists uq_exercises_global_name on exercises (name) where is_global;
