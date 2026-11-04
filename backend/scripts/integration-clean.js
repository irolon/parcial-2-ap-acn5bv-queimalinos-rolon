import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { assertRealSupabase } from './lib/qa-env.js';
import { deleteQaData, findStaleQaTrainerIds } from './lib/qa-cleanup.js';

// Uso (desde backend/): npm run test:integration:clean [-- --check]
// Sin flag borra los trainers QA (it.%@test.fittrainer.dev) creados hace más de 1 hora.
// Con --check solo cuenta todos los QA que quedan y sale con 1 si hay alguno.
assertRealSupabase(process.env);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

if (process.argv.includes('--check')) {
  const remaining = await findStaleQaTrainerIds(supabase, { all: true });
  console.log(`QA restantes: ${remaining.length}`);
  if (remaining.length > 0) process.exit(1);
} else {
  const ids = await findStaleQaTrainerIds(supabase);
  const { trainers, students } = await deleteQaData(supabase, ids);
  console.log(`Borrados: ${trainers} trainers QA, ${students} alumnos`);
}
