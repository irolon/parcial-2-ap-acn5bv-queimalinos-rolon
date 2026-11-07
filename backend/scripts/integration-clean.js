import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { assertRealSupabase } from './lib/qa-env.js';
import { deleteQaData, findStaleQaTrainerIds } from './lib/qa-cleanup.js';
import { deleteOrphanRows, findOrphanRows } from './lib/qa-orphans.js';

// Uso (desde backend/): npm run test:integration:clean [-- --check | -- --orphans]
// Sin flag borra los trainers QA (it.%@test.fittrainer.dev) creados hace más de 1 hora e informa
// las filas de notifications / push_tokens / refresh_tokens cuyo user_id ya no existe, sin
// borrarlas: no se puede saber si las creó la integración (spec §5).
// Con --orphans además borra esas filas sin dueño.
// Con --check solo cuenta (QA que quedan y filas sin dueño) y sale con 1 si hay alguno.
assertRealSupabase(process.env);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const describeOrphans = (orphans) =>
  Object.entries(orphans).map(([table, { rows }]) => `${table} ${rows}`).join(', ');

if (process.argv.includes('--check')) {
  const remaining = await findStaleQaTrainerIds(supabase, { all: true });
  const orphans = await findOrphanRows(supabase);
  const orphanRows = Object.values(orphans).reduce((sum, { rows }) => sum + rows, 0);
  console.log(`QA restantes: ${remaining.length}`);
  console.log(`Filas sin dueño: ${orphanRows} (${describeOrphans(orphans)})`);
  if (remaining.length > 0 || orphanRows > 0) process.exit(1);
} else {
  const ids = await findStaleQaTrainerIds(supabase);
  const { trainers, students } = await deleteQaData(supabase, ids);
  console.log(`Borrados: ${trainers} trainers QA, ${students} alumnos`);
  const orphans = await findOrphanRows(supabase);
  if (process.argv.includes('--orphans')) {
    const deleted = await deleteOrphanRows(supabase, orphans);
    const users = Object.entries(deleted).map(([table, n]) => `${table} ${n}`).join(', ');
    console.log(`Filas sin dueño borradas (usuarios por tabla): ${users}`);
  } else {
    console.log(`Filas sin dueño (no se borran; usá --orphans): ${describeOrphans(orphans)}`);
  }
}
