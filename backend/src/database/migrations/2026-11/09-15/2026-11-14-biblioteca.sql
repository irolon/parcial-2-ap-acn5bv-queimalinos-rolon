-- ============================================================================
-- Deseable · Archivar ejercicios en uso en vez de bloquear el borrado.
-- Re-ejecutable y aditiva. Correr en el SQL Editor de Supabase (o vía MCP) ANTES de
-- desplegar el backend: los listados filtran `archived_at is null` y sin la columna
-- la biblioteca responde error. También está en database/schema/ (03-routines.sql).
-- DELETE /exercises/:id de un ejercicio que está en una rutina o en una sesión ya no
-- responde 409: le pone fecha a archived_at y sale de la biblioteca, pero las rutinas,
-- plantillas y el historial lo siguen resolviendo por id.
-- ============================================================================

-- null = activo; con fecha = archivado (y cuándo).
alter table exercises add column if not exists archived_at timestamptz;

notify pgrst, 'reload schema';
