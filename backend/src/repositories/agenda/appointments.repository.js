import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { APPOINTMENTS_TABLE, APPOINTMENT_COLUMNS, STATUS } from '../../models/agenda/appointment.model.js';

const UNIQUE_VIOLATION = '23505';

/**
 * Turnos con el alumno embebido, entre `fromUtc` (incluido) y `toUtc` (excluido), ordenados.
 * `filter` es { trainer_id } o { student_id }.
 */
export async function findAppointmentsInRange(filter, fromUtc, toUtc) {
  let query = supabase.from(APPOINTMENTS_TABLE).select(APPOINTMENT_COLUMNS);
  for (const [column, value] of Object.entries(filter)) query = query.eq(column, value);
  return unwrap(
    await query
      .gte('scheduled_at', fromUtc.toISOString())
      .lt('scheduled_at', toUtc.toISOString())
      .order('scheduled_at')
  );
}

/** `scheduled_at` de los turnos que ocupan horario (pending y confirmed) del entrenador en el rango [from, to). */
export async function findTakenInRange(trainerId, fromUtc, toUtc) {
  const rows = unwrap(
    await supabase
      .from(APPOINTMENTS_TABLE)
      .select('scheduled_at')
      .eq('trainer_id', trainerId)
      .in('status', [STATUS.PENDING, STATUS.CONFIRMED])
      .gte('scheduled_at', fromUtc.toISOString())
      .lt('scheduled_at', toUtc.toISOString())
  );
  return rows.map((r) => r.scheduled_at);
}

/** Inserta el turno. Si el horario ya está ocupado (índice único parcial, 23505) lanza SLOT_TAKEN. */
export async function insertAppointment(row) {
  const res = await supabase.from(APPOINTMENTS_TABLE).insert(row).select(APPOINTMENT_COLUMNS).single();
  if (res.error?.code === UNIQUE_VIOLATION) throw Errors.slotTaken();
  return unwrap(res);
}

/** Turno con el alumno embebido, o null si no existe. */
export async function findAppointmentById(id) {
  return unwrap(
    await supabase.from(APPOINTMENTS_TABLE).select(APPOINTMENT_COLUMNS).eq('id', id).maybeSingle()
  );
}

/**
 * Cambia el estado solo si el turno sigue en `fromStatus` (condición optimista).
 * Devuelve el turno actualizado, o null si nadie lo actualizó porque el estado cambió en el medio.
 */
export async function updateStatus(id, fromStatus, toStatus) {
  return unwrap(
    await supabase
      .from(APPOINTMENTS_TABLE)
      .update({ status: toStatus })
      .eq('id', id)
      .eq('status', fromStatus)
      .select(APPOINTMENT_COLUMNS)
      .maybeSingle()
  );
}
