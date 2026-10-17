-- ============================================================================
-- FitTrainer — Chequeos de la biblioteca global de ejercicios.
-- Cero filas = seed completo y consistente (50 ejercicios globales con video).
-- Ejecutar en el SQL Editor de Supabase (o vía MCP execute_sql) después del seed.
-- Las listas de muscle_group y equipment son copia literal de las constantes
-- MUSCLE_GROUPS y EQUIPMENT de models/exercises/exercise.model.js.
-- ============================================================================
select 'se esperaban 50 ejercicios globales y hay ' || count(*) as problema,
       null::text as ejercicio
from exercises
where is_global
having count(*) <> 50

union all
select 'global con trainer_id no nulo', name
from exercises
where is_global and trainer_id is not null

union all
select 'global con muscle_group fuera de la lista: ' || coalesce(muscle_group, 'null'), name
from exercises
where is_global
  and (muscle_group is null or muscle_group <> all (array[
    'chest', 'back', 'shoulders', 'legs', 'glutes', 'biceps', 'triceps',
    'core', 'calves', 'full_body', 'cardio'
  ]))

union all
select 'global con equipment fuera de la lista: ' || coalesce(equipment, 'null'), name
from exercises
where is_global
  and (equipment is null or equipment <> all (array[
    'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band'
  ]))

union all
select 'global sin video_url', name
from exercises
where is_global and (video_url is null or btrim(video_url) = '')

union all
select 'nombre global repetido (' || count(*) || ' veces)', name
from exercises
where is_global
group by name
having count(*) > 1;
