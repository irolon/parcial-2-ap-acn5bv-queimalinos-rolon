-- ============================================================================
-- Tarjeta descanso ajustable · Descanso real por serie. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (04-progress.sql).
-- ============================================================================

-- Segundos que el alumno descansó después de la serie, medidos por el celular
-- (incluye ±15″, la pausa y "Saltar"). Null = sin dato: series anteriores, la
-- última serie de la sesión o un ejercicio sin descanso.
alter table session_sets
  add column if not exists rest_seconds int check (rest_seconds >= 0);
