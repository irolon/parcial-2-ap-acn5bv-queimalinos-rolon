-- ============================================================================
-- Tarjeta 43 · Plantillas de desafíos globales. Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o vía MCP). También está en database/seeds/challenges.sql.
-- Renombra la racha global a "2 semanas" y suma la plantilla de 8 sesiones en 4 semanas.
-- ============================================================================

update challenges
set name = 'Racha de 2 semanas',
    description = 'Entrená todos los días asignados durante 2 semanas seguidas.'
where trainer_id is null and name = 'Racha de 14 días';

insert into challenges (trainer_id, name, description, goal_type, goal_value, duration_days, reward_achievement_id)
select null, '8 sesiones en 4 semanas', 'Cerrá 8 sesiones de entrenamiento en 4 semanas.', 'sessions_count', 8, 28, null
where not exists (
  select 1 from challenges c where c.name = '8 sesiones en 4 semanas' and c.trainer_id is null
);
