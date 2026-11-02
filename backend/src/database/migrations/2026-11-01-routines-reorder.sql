-- ============================================================================
-- Tarjeta E8 (app del entrenador) · Reordenar los ejercicios de una rutina de forma atómica.
-- Re-ejecutable. Correr en el SQL Editor de Supabase (o vía MCP). También está en
-- database/schema/ (03-routines.sql). La usa PUT /routines/:id/exercises/order.
-- ============================================================================

-- Reordena los ejercicios de una rutina en una sola transacción: bloquea la
-- rutina (dos reorders de la misma rutina no se pisan), comprueba que p_ids sea
-- exactamente el conjunto de sus ejercicios, sin repetidos, y deja
-- order_index = posición (0..n-1). Devuelve false, sin tocar nada, si el
-- conjunto no coincide. Nunca queda un orden a medias.
create or replace function reorder_routine_exercises(p_routine_id uuid, p_ids uuid[])
returns boolean
language plpgsql security invoker
set search_path = public
as $$
begin
  perform 1 from routines where id = p_routine_id for update;
  if coalesce(cardinality(p_ids), 0) = 0
     or (select count(distinct x) from unnest(p_ids) as x) <> cardinality(p_ids)
     or (select count(*) from routine_exercises where routine_id = p_routine_id) <> cardinality(p_ids)
     or exists (
       select 1 from routine_exercises re
       where re.routine_id = p_routine_id and not (re.id = any (p_ids))
     ) then
    return false;
  end if;
  update routine_exercises re
     set order_index = o.pos - 1
    from unnest(p_ids) with ordinality as o(id, pos)
   where re.routine_id = p_routine_id and re.id = o.id;
  return true;
end;
$$;

revoke all on function reorder_routine_exercises(uuid, uuid[]) from public, anon, authenticated;
grant execute on function reorder_routine_exercises(uuid, uuid[]) to service_role;
