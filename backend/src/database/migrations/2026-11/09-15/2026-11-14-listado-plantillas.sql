-- ============================================================================
-- Deseable · Listado de plantillas sin traer la structure entera.
-- Re-ejecutable y aditiva. Correr en el SQL Editor de Supabase (o vía MCP) ANTES
-- de deployar el backend: GET /routine-templates pasa a leer de esta vista.
-- También está en database/schema/ (03-routines.sql).
-- ============================================================================

-- Resumen de cada plantilla para GET /routine-templates: sin structure, con
-- `days` (structure->'days' tal cual, en el mismo orden; [] si no es un arreglo)
-- y `exercise_count` (ítems objeto o arreglo de structure->'exercises', como el
-- `typeof e === 'object'` que usaba el backend; 0 si no es un arreglo).
-- security_invoker: la vista aplica el RLS de routine_templates a quien la
-- consulta (activo y sin políticas: la anon key no ve nada). El backend usa la
-- service_role y filtra por trainer_id.
create or replace view routine_templates_summary with (security_invoker = true) as
  select
    t.id,
    t.trainer_id,
    t.name,
    t.goal,
    t.level,
    t.frequency_per_week,
    t.generated_by_ai,
    t.created_at,
    case when jsonb_typeof(t.structure -> 'days') = 'array'
      then t.structure -> 'days' else '[]'::jsonb end as days,
    case when jsonb_typeof(t.structure -> 'exercises') = 'array'
      then (
        select count(*)::int
        from jsonb_array_elements(t.structure -> 'exercises') as e (item)
        where jsonb_typeof(e.item) in ('object', 'array')
      )
      else 0 end as exercise_count
  from routine_templates t;

notify pgrst, 'reload schema';
