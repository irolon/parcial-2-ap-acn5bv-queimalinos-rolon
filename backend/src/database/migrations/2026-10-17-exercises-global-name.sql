-- ============================================================================
-- Tarjeta 1 · Seed de ejercicios. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/schema/ (03-routines.sql).
-- ============================================================================

-- Un nombre no se repite entre los globales; hace idempotente el seed (on conflict).
-- Antes de correrla en una base existente, verificar que no haya globales con nombre repetido (si los hay, el índice falla y hay que resolverlos a mano, sin borrar ejercicios usados por rutinas):
-- select name, count(*) from exercises where is_global group by name having count(*) > 1;
create unique index if not exists uq_exercises_global_name on exercises (name) where is_global;
