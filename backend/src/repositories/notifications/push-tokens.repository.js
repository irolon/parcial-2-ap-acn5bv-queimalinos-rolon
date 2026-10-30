import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { PUSH_TOKENS_TABLE } from '../../models/notifications/notification.model.js';

/** Tokens (strings) de todos los dispositivos del usuario. */
export async function findTokensForUser(userId) {
  const rows = unwrap(await supabase.from(PUSH_TOKENS_TABLE).select('token').eq('user_id', userId));
  return rows.map((r) => r.token);
}

export async function deleteTokens(tokens) {
  if (tokens.length === 0) return;
  unwrap(await supabase.from(PUSH_TOKENS_TABLE).delete().in('token', tokens));
}
