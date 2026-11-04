import { QA_EMAIL_LIKE } from './qa-env.js';

/**
 * Borrado de los datos de QA de la suite de integración (lo único que se hace
 * directo contra la base). Lo comparten el afterAll de cada archivo y
 * `npm run test:integration:clean`. Solo toca trainers cuyo email es de QA.
 */
const TABLES_WITHOUT_FK = ['notifications', 'push_tokens', 'refresh_tokens'];

async function run(query) {
  const { data, error } = await query;
  if (error) throw new Error(`qa-cleanup: ${error.message}`);
  return data ?? [];
}

/** Borra los trainers QA de la lista (y por cascada sus alumnos y datos). */
export async function deleteQaData(supabase, trainerIds) {
  if (trainerIds.length === 0) return { trainers: 0, students: 0 };

  const trainers = await run(
    supabase.from('trainers').select('id').in('id', trainerIds).like('email', QA_EMAIL_LIKE)
  );
  const confirmed = trainers.map((t) => t.id);
  if (confirmed.length === 0) return { trainers: 0, students: 0 };

  const students = await run(supabase.from('students').select('id').in('trainer_id', confirmed));
  const userIds = [...confirmed, ...students.map((s) => s.id)];

  for (const table of TABLES_WITHOUT_FK) {
    await run(supabase.from(table).delete().in('user_id', userIds));
  }
  await run(supabase.from('trainers').delete().in('id', confirmed));
  return { trainers: confirmed.length, students: students.length };
}

/** Ids de los trainers QA creados hace más de `olderThanMs` (o todos con `all`). */
export async function findStaleQaTrainerIds(
  supabase,
  { now = new Date(), olderThanMs = 3600000, all = false } = {}
) {
  let query = supabase.from('trainers').select('id').like('email', QA_EMAIL_LIKE);
  if (!all) query = query.lt('created_at', new Date(now.getTime() - olderThanMs).toISOString());
  const rows = await run(query);
  return rows.map((r) => r.id);
}
