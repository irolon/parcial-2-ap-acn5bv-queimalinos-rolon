-- ============================================================================
-- FitTrainer — Seed de desafíos globales (trainer_id null) de ejemplo
-- Ejecutar DESPUÉS de seeds/achievements.sql (el tercero premia "Desafío cumplido").
-- Es re-ejecutable: solo inserta un desafío si todavía no hay uno global con ese nombre.
-- ============================================================================

insert into challenges (trainer_id, name, description, goal_type, goal_value, duration_days, reward_achievement_id)
select null, v.name, v.description, v.goal_type, v.goal_value, v.duration_days,
       (select a.id from achievements a where a.code = v.reward_code)
from (values
  ('12 sesiones en 30 días', 'Cerrá 12 sesiones de entrenamiento en 30 días.', 'sessions_count', 12, 30, null),
  ('Racha de 2 semanas', 'Entrená todos los días asignados durante 2 semanas seguidas.', 'streak', 14, 30, null),
  ('8 sesiones en 4 semanas', 'Cerrá 8 sesiones de entrenamiento en 4 semanas.', 'sessions_count', 8, 28, null),
  ('10 toneladas en 4 semanas', 'Levantá 10.000 kg de volumen total (series × repeticiones × kg) en 4 semanas.', 'volume', 10000, 28, 'CHALLENGE_DONE')
) as v (name, description, goal_type, goal_value, duration_days, reward_code)
where not exists (
  select 1 from challenges c where c.name = v.name and c.trainer_id is null
);
