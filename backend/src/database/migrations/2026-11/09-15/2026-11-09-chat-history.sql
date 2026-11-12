-- ============================================================================
-- GX5 (asistente IA del alumno en la web) · Historial del chat con contexto.
-- Re-ejecutable y aditiva. Correr en el SQL Editor de Supabase (o vía MCP). También
-- está en database/schema/ (06-ai-and-agenda/01-ai.sql). La usan POST /chat, GET /chat/today
-- y GET /chat/history.
-- ============================================================================

-- El ejercicio sobre el que se preguntó (el actual de la sesión, si era accesible).
-- Va en la consulta y en su respuesta: "Aplicar" compara contra él. Si se borra el
-- ejercicio, el mensaje queda sin contexto.
alter table chat_messages
  add column if not exists exercise_id uuid references exercises (id) on delete set null;

-- Las sugerencias ya validadas de la respuesta: [{ exercise_id, name, reason }].
-- En las consultas del alumno y en los mensajes de antes de esta migración, [].
alter table chat_messages
  add column if not exists suggestions jsonb not null default '[]';

-- Sin índice nuevo: idx_chat_messages_student (student_id, created_at) alcanza para
-- leer por día y para el historial paginado por fecha.

notify pgrst, 'reload schema';
