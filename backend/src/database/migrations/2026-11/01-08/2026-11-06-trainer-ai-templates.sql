-- ============================================================================
-- Tarjeta 15 (asistente IA del entrenador) · Guardar una propuesta como plantillas.
-- Re-ejecutable. Correr en el SQL Editor de Supabase (o vía MCP). También está en
-- database/schema/ (06-ai-and-agenda/01-ai.sql). La usa POST /trainer-ai/save-as-template.
-- ============================================================================

-- Todas las plantillas que salieron de la generación (una por bloque), en orden.
-- routine_template_id sigue apuntando a la primera. Sin FK (es un arreglo): si se
-- borra una plantilla, su id queda como historia de lo que se guardó.
alter table ai_routine_generations
  add column if not exists routine_template_ids uuid[] not null default '{}';

-- Crea las plantillas (generated_by_ai = true) y marca la generación en una sola
-- transacción: o quedan todas o ninguna. Bloquea la generación, así dos guardados
-- simultáneos no duplican plantillas: el segundo ve was_used y falla con FT002.
-- FT003 si la generación no existe o es de otro trainer. Devuelve las plantillas en
-- el orden de p_templates ([{ name, goal, level, frequency_per_week, structure }]).
create or replace function save_ai_generation_templates(
  p_generation_id uuid, p_trainer_id uuid, p_templates jsonb
)
returns setof routine_templates
language plpgsql security invoker
set search_path = public
as $$
declare
  v_used boolean;
  v_ids  uuid[] := '{}';
  v_id   uuid;
  t      jsonb;
begin
  select was_used into v_used from ai_routine_generations
   where id = p_generation_id and trainer_id = p_trainer_id
   for update;
  if not found then
    raise exception 'La propuesta no existe' using errcode = 'FT003';
  end if;
  if v_used then
    raise exception 'La propuesta ya se guardó como plantilla' using errcode = 'FT002';
  end if;
  if jsonb_typeof(p_templates) is distinct from 'array' or jsonb_array_length(p_templates) = 0 then
    raise exception 'p_templates tiene que ser un arreglo no vacío' using errcode = '22023';
  end if;

  for t in select value from jsonb_array_elements(p_templates) loop
    insert into routine_templates (trainer_id, name, goal, level, frequency_per_week, generated_by_ai, structure)
    values (p_trainer_id, t->>'name', t->>'goal', t->>'level', (t->>'frequency_per_week')::int, true, t->'structure')
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;

  update ai_routine_generations
     set was_used = true, routine_template_id = v_ids[1], routine_template_ids = v_ids
   where id = p_generation_id;

  return query
    select rt.* from routine_templates rt
     where rt.id = any (v_ids)
     order by array_position(v_ids, rt.id);
end;
$$;

revoke all on function save_ai_generation_templates(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function save_ai_generation_templates(uuid, uuid, jsonb) to service_role;
