import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { AVAILABILITY_TABLE, AVAILABILITY_COLUMNS } from '../../models/agenda/availability.model.js';

/** Reemplaza TODA la disponibilidad del entrenador de forma atómica (RPC) y devuelve lo guardado, ordenado. */
export async function replaceAvailability(trainerId, slots) {
  return unwrap(await supabase.rpc('replace_trainer_availability', { p_trainer: trainerId, p_slots: slots }));
}

/** Franjas semanales del entrenador, ordenadas por día y hora de inicio. */
export async function findAvailability(trainerId) {
  return unwrap(
    await supabase
      .from(AVAILABILITY_TABLE)
      .select(AVAILABILITY_COLUMNS)
      .eq('trainer_id', trainerId)
      .order('weekday')
      .order('start_time')
  );
}
