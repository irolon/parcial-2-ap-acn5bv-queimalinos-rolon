import { deleteQaData } from '../lib/qa-cleanup.js';
import { DEMO_EMAIL_LIKE } from './people.js';

/** Borra la demo: los trainers @demo.fittrainer.dev, sus alumnos (y por cascada todo lo demás). */
export async function resetDemo(supabase) {
  const { data, error } = await supabase.from('trainers').select('id').like('email', DEMO_EMAIL_LIKE);
  if (error) throw new Error(`demo reset: ${error.message}`);
  const ids = (data ?? []).map((t) => t.id);
  return deleteQaData(supabase, ids, { emailLike: DEMO_EMAIL_LIKE });
}
