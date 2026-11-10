import { supabase } from '../../../src/config/supabase.js';
import { settleInFlight } from '../../../src/shared/utils/async/in-flight.js';
import { deleteQaData } from '../../../scripts/lib/qa-cleanup.js';
import { trackedTrainerIds } from './registry.js';

/**
 * Borra todo lo de la corrida: filas sin FK de PT y alumnos y después los
 * trainers (los alumnos y el resto caen por cascada). Idempotente.
 * Antes espera a los avisos que quedaron corriendo (récords, logros, comentarios):
 * si insertaran después del borrado, dejarían filas en `notifications` sin dueño.
 */
export async function cleanupRun() {
  await settleInFlight();
  await deleteQaData(supabase, trackedTrainerIds());
}
