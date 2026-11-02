-- ============================================================================
-- FitTrainer — Seed del catálogo de logros (11 logros)
-- Ejecutar DESPUÉS de database/schema/ (01 a 07) en el SQL Editor de Supabase.
-- Es re-ejecutable: el upsert usa la restricción única de `code`, así que
-- correrlo N veces deja siempre las mismas 11 filas (y actualiza sus textos y reglas).
-- La regla de cada logro vive en `criteria` (jsonb) y la lee el evaluador:
-- sessions_count {value}, streak {days}, pr_count {value}, full_week {count}.
-- La meta tiene que ser un número mayor a 0: con 0, negativa o sin cargar, el logro nunca se otorga.
-- `challenge` no lo otorga el evaluador: lo da el desafío que lo premia.
-- ============================================================================

insert into achievements (code, name, description, category, criteria) values
  ('FIRST_SESSION', 'Primera sesión', 'Cerraste tu primera sesión de entrenamiento.', 'milestone', '{"type":"sessions_count","value":1}'),
  ('SESSIONS_10', '10 sesiones', 'Completaste 10 sesiones de entrenamiento.', 'milestone', '{"type":"sessions_count","value":10}'),
  ('SESSIONS_50', '50 sesiones', 'Completaste 50 sesiones de entrenamiento.', 'milestone', '{"type":"sessions_count","value":50}'),
  ('SESSIONS_100', '100 sesiones', 'Completaste 100 sesiones de entrenamiento.', 'milestone', '{"type":"sessions_count","value":100}'),
  ('STREAK_7_DAYS', 'Racha de 7 días', 'Entrenaste todos los días asignados durante 7 días seguidos.', 'streak', '{"type":"streak","days":7}'),
  ('STREAK_30_DAYS', 'Racha de 30 días', 'Entrenaste todos los días asignados durante 30 días seguidos.', 'streak', '{"type":"streak","days":30}'),
  ('FIRST_PR', 'Primer récord', 'Superaste tu mejor marca en un ejercicio por primera vez.', 'pr', '{"type":"pr_count","value":1}'),
  ('PR_10', '10 récords', 'Lograste récords personales en 10 sesiones.', 'pr', '{"type":"pr_count","value":10}'),
  ('FIRST_FULL_WEEK', 'Primera semana completa', 'Entrenaste todos los días asignados de una semana.', 'consistency', '{"type":"full_week","count":1}'),
  ('FULL_WEEKS_4', '4 semanas completas', 'Completaste 4 semanas con todos los días asignados entrenados.', 'consistency', '{"type":"full_week","count":4}'),
  ('CHALLENGE_DONE', 'Desafío cumplido', 'Cumpliste la meta de un desafío.', 'milestone', '{"type":"challenge"}')
on conflict (code) do update set
  name        = excluded.name,
  description = excluded.description,
  category    = excluded.category,
  criteria    = excluded.criteria;
