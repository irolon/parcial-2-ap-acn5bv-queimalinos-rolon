-- ============================================================================
-- Tarjeta 46 · Agenda (review de la #64). Re-ejecutable.
-- Correr en el SQL Editor de Supabase (o con pg) DESPUÉS de 2026-11-01-agenda-followup.sql.
-- También está en database/schema/ (06-ai-and-agenda.sql).
-- ============================================================================

-- ── Ningún turno nuevo para un alumno dado de baja ───────────────────────────
-- El backend ya lo chequea antes de insertar, pero un POST /appointments en
-- vuelo pudo leer active = true justo antes de la baja. La baja guarda
-- active = false y después cancela los turnos futuros; este trigger cierra el
-- hueco del medio:
-- - si la baja ya se guardó, el insert la ve y se rechaza (FT001 → 403);
-- - si no, `for share` bloquea la fila del alumno hasta que termine el insert:
--   el UPDATE de la baja espera, y la cancelación que viene después ya ve el
--   turno nuevo y lo cancela.
create or replace function appointments_student_active()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  is_active boolean;
begin
  select active into is_active from students where id = new.student_id for share;
  if is_active is distinct from true then
    raise exception 'El alumno está dado de baja' using errcode = 'FT001';
  end if;
  return new;
end $$;
revoke all on function appointments_student_active() from public, anon, authenticated;

drop trigger if exists appointments_student_active on appointments;
create trigger appointments_student_active
  before insert on appointments
  for each row execute function appointments_student_active();
