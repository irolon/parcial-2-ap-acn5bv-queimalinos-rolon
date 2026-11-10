import 'dotenv/config';
import { assertRealSupabase } from '../../../scripts/lib/qa-env.js';

/** Corta la suite antes de crear nada si backend/.env no apunta a un Supabase real. */
export default async function globalSetup() {
  assertRealSupabase(process.env);
}
