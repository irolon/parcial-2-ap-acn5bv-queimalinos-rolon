import { supabase } from '../../../src/config/supabase.js';
import { deleteQaData } from '../../../scripts/lib/qa-cleanup.js';
import { trackedTrainerIds } from './registry.js';

/**
 * Borra todo lo de la corrida: filas sin FK de PT y alumnos y después los
 * trainers (los alumnos y el resto caen por cascada). Idempotente.
 */
export async function cleanupRun() {
  await deleteQaData(supabase, trackedTrainerIds());
}
