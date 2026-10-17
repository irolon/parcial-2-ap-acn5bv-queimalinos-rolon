import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Cliente de Supabase con la SERVICE ROLE key.
 * Se usa desde la capa Repository (server-side) y bypasea RLS, por lo que
 * la autorización por rol/ownership se valida en la capa Service.
 *
 * NUNCA exponer la service role key al cliente (web/mobile).
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
