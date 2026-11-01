-- ============================================================================
-- Tarjeta 46 · Agenda (seguimiento de la review de la #49). Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o con pg) DESPUÉS de 2026-10-31-agenda.sql.
-- También está en database/schema/ (06-ai-and-agenda.sql).
-- ============================================================================

-- ── Checks de appointments: el anti-solapamiento lo exige la base ────────────
-- El índice uq_appointments_trainer_slot compara solo scheduled_at: sirve si
-- todos los turnos duran 60 min y empiezan en hora en punto. Hasta ahora eso lo
-- garantizaba solo el backend; con estos checks, un seed, un SQL a mano o un
-- endpoint futuro tampoco pueden meter un 18:30 o un turno de 90 min.
--
-- Hora en punto: el resto de la época (UTC) por 3600 es 0, así que minuto,
-- segundo y milisegundo son 0. Argentina es UTC-3 fijo (hora entera): la hora
-- en punto en UTC es la hora en punto en Argentina.
--
-- Filas previas: antes de agregar los checks se cuentan las que los violarían y,
-- si hay, se corta con un error que dice cuántas (nada queda a medias). Los
-- checks se agregan `not valid` (sin escanear la tabla bajo lock fuerte) y
-- después se validan con `validate constraint`.
do $$
declare
  bad int;
begin
  select count(*) into bad from appointments
  where duration_min <> 60 or mod(extract(epoch from scheduled_at), 3600) <> 0;
  if bad > 0 then
    raise exception 'Hay % turnos que no duran 60 min o no empiezan en hora en punto: corregilos antes de aplicar', bad;
  end if;
end $$;

-- El check viejo (duration_min > 0, nombre automático) queda reemplazado por = 60.
alter table appointments drop constraint if exists appointments_duration_min_check;
alter table appointments drop constraint if exists appointments_duration_60;
alter table appointments add constraint appointments_duration_60 check (duration_min = 60) not valid;
alter table appointments validate constraint appointments_duration_60;

alter table appointments drop constraint if exists appointments_on_the_hour;
alter table appointments add constraint appointments_on_the_hour
  check (mod(extract(epoch from scheduled_at), 3600) = 0) not valid;
alter table appointments validate constraint appointments_on_the_hour;

-- ── Disponibilidad: dos guardados simultáneos del mismo PT van en fila ───────
-- Sin lock, dos pestañas que guardan a la vez hacen cada una su delete sin ver
-- el insert de la otra y quedan las dos franjas (o un 23505 sin traducir). El
-- advisory lock por entrenador dura hasta el fin de la transacción de la RPC:
-- la segunda espera a la primera y reemplaza lo que guardó. Resto igual.
create or replace function replace_trainer_availability(p_trainer uuid, p_slots jsonb)
returns setof trainer_availability language plpgsql security invoker set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_trainer::text));
  delete from trainer_availability where trainer_id = p_trainer;
  insert into trainer_availability (trainer_id, weekday, start_time, end_time)
  select p_trainer, (s->>'weekday')::smallint, (s->>'start_time')::time, (s->>'end_time')::time
  from jsonb_array_elements(p_slots) s;
  return query select * from trainer_availability where trainer_id = p_trainer order by weekday, start_time;
end $$;
revoke all on function replace_trainer_availability(uuid, jsonb) from public, anon, authenticated;
grant execute on function replace_trainer_availability(uuid, jsonb) to service_role;
